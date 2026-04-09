from __future__ import annotations

import platform
import gc
import sys
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any


MAX_EVIDENCE_ITEMS = {
    "answer": 12,
    "summary": 10,
}

MAX_EVIDENCE_CHARS = {
    "answer": 1000,
    "summary": 750,
}


def clip_text(value: str, max_chars: int) -> str:
    if len(value) <= max_chars:
        return value
    return f"{value[: max_chars - 3].rstrip()}..."


def create_prompt(mode: str, instruction: str, evidence: list[str]) -> str:
    clipped_evidence = [
        f"{index + 1}. {clip_text(entry, MAX_EVIDENCE_CHARS[mode])}"
        for index, entry in enumerate(evidence[: MAX_EVIDENCE_ITEMS[mode]])
    ]

    return "\n\n".join(
        [
            "Use only the provided local lecture evidence.",
            "Read every lecture evidence block before answering.",
            (
            "Think carefully through the full lecture evidence first, then respond in 3 to 5 grounded sentences."
                if mode == "answer"
                else "Think carefully through the full lecture evidence first, then respond as a short structured summary."
            ),
            "Do not invent outside facts, reveal your reasoning, or mention the prompt.",
            f"Instruction: {instruction}",
            "Lecture evidence to review:",
            "\n".join(clipped_evidence) if clipped_evidence else "No evidence provided.",
            "Final answer:" if mode == "answer" else "Final summary:",
        ]
    )


def limit_answer_text(value: str) -> str:
    sentences = [
        sentence.strip()
        for sentence in value.replace("\n", " ").replace("<|turn|>", " ").replace("<turn|>", " ").split(".")
        if sentence.strip()
    ][:6]
    if not sentences:
        return value.strip()
    return ". ".join(sentences).rstrip(".") + "."


def limit_summary_text(value: str) -> str:
    normalized_value = value.replace("<|turn|>", " ").replace("<turn|>", " ")
    paragraphs = [paragraph.strip() for paragraph in normalized_value.split("\n\n") if paragraph.strip()][:5]
    return "\n\n".join(paragraphs).strip() or value.strip()


def detect_total_memory_bytes() -> int | None:
    if sys.platform.startswith("linux"):
        try:
            with open("/proc/meminfo", "r", encoding="utf-8") as handle:
                for line in handle:
                    if line.startswith("MemTotal:"):
                        return int(line.split()[1]) * 1024
        except OSError:
            return None

    if sys.platform == "win32":
        try:
            import ctypes

            class MemoryStatus(ctypes.Structure):
                _fields_ = [
                    ("length", ctypes.c_uint32),
                    ("memory_load", ctypes.c_uint32),
                    ("total_phys", ctypes.c_uint64),
                    ("avail_phys", ctypes.c_uint64),
                    ("total_page_file", ctypes.c_uint64),
                    ("avail_page_file", ctypes.c_uint64),
                    ("total_virtual", ctypes.c_uint64),
                    ("avail_virtual", ctypes.c_uint64),
                    ("avail_extended_virtual", ctypes.c_uint64),
                ]

            status = MemoryStatus()
            status.length = ctypes.sizeof(MemoryStatus)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status))
            return int(status.total_phys)
        except Exception:
            return None

    return None


def format_gib(bytes_value: int | None) -> str | None:
    if bytes_value is None or bytes_value <= 0:
        return None
    return f"{bytes_value / (1024 ** 3):.1f} GB"


def _bytes_to_gib_ceiling(bytes_value: int, reserve_ratio: float = 0.8) -> str:
    usable_bytes = max(int(bytes_value * reserve_ratio), 1)
    gib = max(usable_bytes // (1024 ** 3), 1)
    return f"{gib}GiB"


@dataclass
class DesktopRuntimeConfig:
    model_path: Path
    device: str
    dtype: str
    quantization: str
    fallback_quantization: str | None
    max_new_tokens: int
    temperature: float
    top_k: int
    top_p: float
    enable_thinking: bool


class DesktopGemmaRunner:
    def __init__(self, config: DesktopRuntimeConfig) -> None:
        self._config = config
        self._torch: Any | None = None
        self._processor: Any | None = None
        self._model: Any | None = None
        self._run_lock = threading.Lock()

    def clear_runtime_cache(self) -> None:
        gc.collect()
        if self._torch is not None and self._torch.cuda.is_available():
            try:
                self._torch.cuda.empty_cache()
            except Exception:
                pass
            try:
                self._torch.cuda.ipc_collect()
            except Exception:
                pass

    def _import_runtime_dependencies(self) -> tuple[Any, Any, Any]:
        try:
            import torch
            from transformers import AutoProcessor
            try:
                from transformers import AutoModelForImageTextToText as AutoModel
            except ImportError:
                from transformers import AutoModelForCausalLM as AutoModel
        except ImportError as error:
            raise RuntimeError(
                "Desktop Gemma runtime dependencies are missing. "
                "Install them with: python -m pip install -U transformers torch accelerate"
            ) from error

        return torch, AutoProcessor, AutoModel

    def _resolve_torch_dtype(self, torch_module: Any) -> Any:
        if self._config.dtype == "float32":
            return torch_module.float32
        if self._config.dtype == "float16":
            return torch_module.float16
        if self._config.dtype == "bfloat16":
            return torch_module.bfloat16

        if self._config.device in {"cuda", "auto"} and torch_module.cuda.is_available():
            return (
                torch_module.bfloat16
                if torch_module.cuda.is_bf16_supported()
                else torch_module.float16
            )

        return torch_module.float32

    def _build_max_memory(self, torch_module: Any) -> dict[Any, str] | None:
        if self._config.device == "cpu" or not torch_module.cuda.is_available():
            return None

        max_memory: dict[Any, str] = {}
        for index in range(torch_module.cuda.device_count()):
            total_memory = int(torch_module.cuda.get_device_properties(index).total_memory)
            max_memory[index] = _bytes_to_gib_ceiling(total_memory, reserve_ratio=0.92)

        total_system_memory = detect_total_memory_bytes()
        if total_system_memory is not None:
            max_memory["cpu"] = _bytes_to_gib_ceiling(total_system_memory, reserve_ratio=0.82)

        return max_memory

    def _build_quantization_config(self, torch_module: Any) -> Any | None:
        if self._config.quantization == "none":
            return None

        if self._config.device == "cpu":
            raise RuntimeError(
                "bitsandbytes quantization requires a CUDA runtime. "
                "Use --device cuda/auto, or pass --quantization none for CPU testing."
            )

        compute_dtype = self._resolve_torch_dtype(torch_module)

        try:
            from transformers import BitsAndBytesConfig
        except ImportError as error:
            raise RuntimeError(
                "bitsandbytes quantization requires Transformers with BitsAndBytesConfig. "
                "Install/update dependencies with: python -m pip install -U transformers bitsandbytes accelerate"
            ) from error

        if self._config.quantization == "bnb-8bit":
            return BitsAndBytesConfig(
                load_in_8bit=True,
                llm_int8_enable_fp32_cpu_offload=True,
            )

        if self._config.quantization == "bnb-4bit-nf4":
            return BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=compute_dtype,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True,
            )

        raise RuntimeError(f"Unsupported desktop quantization profile: {self._config.quantization}")

    def _apply_cuda_runtime_tuning(self, torch_module: Any) -> None:
        if self._config.device == "cpu" or not torch_module.cuda.is_available():
            return

        try:
            torch_module.backends.cuda.matmul.allow_tf32 = True
        except Exception:
            pass

        try:
            torch_module.backends.cudnn.allow_tf32 = True
        except Exception:
            pass

        try:
            torch_module.set_float32_matmul_precision("high")
        except Exception:
            pass

    def _build_model_kwargs(self, torch_module: Any) -> dict[str, Any]:
        torch_dtype = self._resolve_torch_dtype(torch_module)
        quantization_config = self._build_quantization_config(torch_module)

        model_kwargs: dict[str, Any] = {
            "pretrained_model_name_or_path": str(self._config.model_path),
            "local_files_only": True,
            "dtype": torch_dtype,
            "low_cpu_mem_usage": True,
        }

        if quantization_config is not None:
            model_kwargs["quantization_config"] = quantization_config

        if self._config.device == "cpu":
            model_kwargs["device_map"] = None
        else:
            model_kwargs["device_map"] = "auto"
            model_kwargs["max_memory"] = self._build_max_memory(torch_module)
            model_kwargs["offload_folder"] = str(self._config.model_path.parent / ".desktop-offload")
            model_kwargs["offload_state_dict"] = True
            model_kwargs["attn_implementation"] = "sdpa"

        return model_kwargs

    def _load_with_quantization(self, auto_model: Any, model_kwargs: dict[str, Any]) -> Any:
        try:
            return auto_model.from_pretrained(**model_kwargs)
        except Exception as error:
            error_message = str(error)
            should_retry_with_fallback = (
                self._config.fallback_quantization is not None
                and self._config.quantization != self._config.fallback_quantization
                and (
                    "dispatched on the CPU or the disk" in error_message
                    or "out of memory" in error_message.lower()
                    or "Int8Params.__new__()" in error_message
                    or "bitsandbytes" in error_message.lower()
                )
            )

            if not should_retry_with_fallback:
                raise

            self.clear_runtime_cache()

            self._config.quantization = self._config.fallback_quantization
            fallback_kwargs = self._build_model_kwargs(self._torch)
            return auto_model.from_pretrained(**fallback_kwargs)

    def _load(self) -> None:
        if self._model is not None and self._processor is not None and self._torch is not None:
            return

        if not (self._config.model_path / "config.json").exists():
            raise RuntimeError(
                f"Desktop Gemma model files are missing at {self._config.model_path}. "
                "Run: npm run model:download:desktop"
            )

        torch_module, auto_processor, auto_model = self._import_runtime_dependencies()
        self._apply_cuda_runtime_tuning(torch_module)
        self._torch = torch_module
        model_kwargs = self._build_model_kwargs(torch_module)

        try:
            processor = auto_processor.from_pretrained(
                str(self._config.model_path),
                local_files_only=True,
            )
            model = self._load_with_quantization(auto_model, model_kwargs)
        except ValueError as error:
            message = str(error)
            if "model type `gemma4`" in message:
                raise RuntimeError(
                    "The installed Transformers build does not recognize the gemma4 architecture yet. "
                    "Upgrade to the newest source build with: "
                    "python -m pip install --upgrade git+https://github.com/huggingface/transformers.git"
                ) from error
            raise

        if self._config.device == "cpu" and quantization_config is None:
            model.to(torch_module.device("cpu"))

        self._processor = processor
        self._model = model

    def _generate_from_messages(
        self,
        *,
        messages: list[dict[str, Any]],
        mode: str,
        images: list[Any] | None = None,
        videos: list[Any] | None = None,
        max_new_tokens: int | None = None,
        temperature: float | None = None,
        top_k: int | None = None,
        top_p: float | None = None,
        enable_thinking: bool | None = None,
    ) -> str:
        self._load()
        assert self._torch is not None
        assert self._processor is not None
        assert self._model is not None

        effective_enable_thinking = (
            self._config.enable_thinking if enable_thinking is None else enable_thinking
        )
        text = self._processor.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=effective_enable_thinking,
        )
        processor_inputs: dict[str, Any] = {
            "text": text,
            "return_tensors": "pt",
        }
        if images:
            processor_inputs["images"] = images
        if videos:
            processor_inputs["videos"] = videos

        inputs = self._processor(**processor_inputs)
        target_device = next(self._model.parameters()).device
        inputs = {key: value.to(target_device) for key, value in inputs.items()}

        input_length = inputs["input_ids"].shape[-1]
        generation_temperature = (
            self._config.temperature if temperature is None else temperature
        )
        generation_top_k = self._config.top_k if top_k is None else top_k
        generation_top_p = self._config.top_p if top_p is None else top_p
        generation_budget = (
            self._config.max_new_tokens if max_new_tokens is None else max_new_tokens
        )
        do_sample = generation_temperature > 0
        is_multimodal = bool(images or videos)

        budgets = (
            self._build_thinking_retry_budgets(
                generation_budget,
                multimodal=is_multimodal,
            )
            if effective_enable_thinking
            else [generation_budget]
        )
        last_runtime_error: RuntimeError | None = None
        decoded = ""

        with self._run_lock:
            for current_budget in budgets:
                try:
                    with self._torch.inference_mode():
                        outputs = self._model.generate(
                            **inputs,
                            max_new_tokens=current_budget,
                            do_sample=do_sample,
                            temperature=generation_temperature if do_sample else None,
                            top_k=generation_top_k if do_sample else None,
                            top_p=generation_top_p if do_sample else None,
                            use_cache=True,
                        )
                except self._torch.OutOfMemoryError as error:
                    self.clear_runtime_cache()
                    raise RuntimeError(
                        "Gemma generation ran out of GPU memory. Retry with smaller visual inputs, "
                        "shorter context, or close other GPU-heavy applications."
                    ) from error

                generated_tokens = outputs[0][input_length:]
                if not effective_enable_thinking:
                    decoded = self._processor.decode(generated_tokens, skip_special_tokens=True).strip()
                    break

                raw_response = self._processor.decode(
                    generated_tokens, skip_special_tokens=False
                ).strip()
                try:
                    decoded = self._extract_final_response(raw_response)
                    break
                except RuntimeError as error:
                    last_runtime_error = error
                    if current_budget == budgets[-1]:
                        raise
                    continue

        if not decoded and last_runtime_error is not None:
            raise last_runtime_error

        if self._config.device != "cpu" and self._torch.cuda.is_available():
            self.clear_runtime_cache()

        if mode == "answer":
            return limit_answer_text(decoded)
        return limit_summary_text(decoded)

    def _extract_final_response(self, decoded_response: str) -> str:
        if "<|channel>thought" not in decoded_response:
            return decoded_response.strip()

        if "<channel|>" not in decoded_response:
            raise RuntimeError(
                "Gemma thinking output did not reach a final answer within the configured token budget. "
                "Increase the desktop max_new_tokens budget for this request."
            )

        return decoded_response.rsplit("<channel|>", 1)[-1].strip()

    def _build_thinking_retry_budgets(
        self,
        requested_budget: int,
        *,
        multimodal: bool = False,
    ) -> list[int]:
        if multimodal:
            budgets = [requested_budget]
            for candidate in (
                max(requested_budget, 768),
                1024,
                1280,
            ):
                if candidate > budgets[-1]:
                    budgets.append(candidate)

            return budgets

        budgets = [requested_budget]
        for candidate in (
            max(requested_budget * 2, 1536),
            2048,
            2560,
        ):
            if candidate > budgets[-1]:
                budgets.append(candidate)

        return budgets

    def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        mode: str,
        max_new_tokens: int | None = None,
        temperature: float | None = None,
        top_k: int | None = None,
        top_p: float | None = None,
        enable_thinking: bool | None = None,
    ) -> str:
        messages = [
            {"role": "system", "content": [{"type": "text", "text": system_prompt}]},
            {"role": "user", "content": [{"type": "text", "text": user_prompt}]},
        ]
        try:
            return self._generate_from_messages(
                messages=messages,
                mode=mode,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_k=top_k,
                top_p=top_p,
                enable_thinking=enable_thinking,
            )
        except ImportError as error:
            if "jinja2" in str(error).lower():
                raise RuntimeError(
                    "Gemma chat templating requires jinja2>=3.1.0. "
                    "Install it with: python -m pip install --upgrade jinja2"
                ) from error
            raise

    def generate_multimodal(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        images: list[Any] | None = None,
        mode: str = "summary",
        max_new_tokens: int = 384,
        temperature: float | None = None,
        top_k: int | None = None,
        top_p: float | None = None,
        enable_thinking: bool | None = None,
    ) -> str:
        user_content: list[dict[str, Any]] = []
        for _ in images or []:
            user_content.append({"type": "image"})
        user_content.append({"type": "text", "text": user_prompt})
        messages = [
            {"role": "system", "content": [{"type": "text", "text": system_prompt}]},
            {"role": "user", "content": user_content},
        ]

        return self._generate_from_messages(
            messages=messages,
            images=images,
            mode=mode,
            max_new_tokens=max_new_tokens,
            temperature=0.0 if temperature is None else temperature,
            top_k=16 if top_k is None else top_k,
            top_p=0.9 if top_p is None else top_p,
            enable_thinking=False if enable_thinking is None else enable_thinking,
        )


def build_doctor_payload(model_path: Path) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "modelPath": str(model_path),
        "modelPathExists": model_path.exists(),
        "modelPresent": (model_path / "config.json").exists(),
        "pythonVersion": platform.python_version(),
        "platform": platform.platform(),
        "totalMemory": format_gib(detect_total_memory_bytes()),
    }

    try:
        import torch

        payload["torchInstalled"] = True
        payload["cudaAvailable"] = bool(torch.cuda.is_available())
        payload["cudaDeviceCount"] = int(torch.cuda.device_count()) if torch.cuda.is_available() else 0
        if torch.cuda.is_available():
            payload["cudaDeviceName"] = torch.cuda.get_device_name(0)
            payload["cudaMemoryGiB"] = round(
                torch.cuda.get_device_properties(0).total_memory / (1024 ** 3),
                2,
            )
    except ImportError:
        payload["torchInstalled"] = False
        payload["cudaAvailable"] = False
        payload["cudaDeviceCount"] = 0

    try:
        import bitsandbytes

        payload["bitsandbytesInstalled"] = True
        payload["bitsandbytesVersion"] = getattr(bitsandbytes, "__version__", None)
    except ImportError:
        payload["bitsandbytesInstalled"] = False

    try:
        import transformers

        payload["transformersInstalled"] = True
        payload["transformersVersion"] = transformers.__version__
        try:
            from transformers.models.auto.configuration_auto import CONFIG_MAPPING

            payload["gemma4SupportedByTransformers"] = "gemma4" in CONFIG_MAPPING
        except Exception:
            payload["gemma4SupportedByTransformers"] = False
    except ImportError:
        payload["transformersInstalled"] = False
        payload["gemma4SupportedByTransformers"] = False

    return payload
