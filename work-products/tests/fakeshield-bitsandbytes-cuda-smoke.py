from importlib.metadata import version
from pathlib import Path

import bitsandbytes
import bitsandbytes.functional as bnb_functional
import torch


assert version("bitsandbytes") == "0.41.3"
assert torch.__version__ == "1.13.0+cu116"
assert torch.version.cuda == "11.6"
assert torch.cuda.is_available()

binary = Path(bitsandbytes.__file__).parent / "libbitsandbytes_cuda116.so"
assert binary.is_file()

source = torch.linspace(-1, 1, 4096, device="cuda")
quantized, state = bnb_functional.quantize_blockwise(source)
restored = bnb_functional.dequantize_blockwise(quantized, state)
max_error = (restored - source).abs().max().item()

assert quantized.is_cuda
assert restored.is_cuda
assert max_error < 0.02

print(
    {
        "bitsandbytes": version("bitsandbytes"),
        "binary": binary.name,
        "torch": torch.__version__,
        "torch_cuda": torch.version.cuda,
        "device": torch.cuda.get_device_name(0),
        "capability": torch.cuda.get_device_capability(0),
        "max_error": max_error,
    }
)
