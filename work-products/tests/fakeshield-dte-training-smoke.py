from importlib.metadata import version

import bitsandbytes
import deepspeed
import flash_attn_2_cuda
import torch
import wandb
from flash_attn import flash_attn_func


assert version("bitsandbytes") == "0.41.3"
assert version("deepspeed") == "0.12.6"
assert version("flash-attn") == "2.3.6"
assert version("wandb") == "0.16.1"
assert torch.__version__ == "1.13.0+cu116"
assert torch.version.cuda == "11.6"
assert torch.cuda.is_available()

shape = (1, 16, 2, 64)
query = torch.randn(shape, device="cuda", dtype=torch.float16, requires_grad=True)
key = torch.randn(shape, device="cuda", dtype=torch.float16, requires_grad=True)
value = torch.randn(shape, device="cuda", dtype=torch.float16, requires_grad=True)

output = flash_attn_func(query, key, value, dropout_p=0.0, causal=False)
assert output.shape == shape
assert torch.isfinite(output).all()

output.float().sum().backward()
for tensor in (query, key, value):
    assert tensor.grad is not None
    assert torch.isfinite(tensor.grad).all()

print(
    {
        "bitsandbytes": version("bitsandbytes"),
        "deepspeed": deepspeed.__version__,
        "flash_attn": version("flash-attn"),
        "flash_extension": flash_attn_2_cuda.__file__,
        "torch": torch.__version__,
        "device": torch.cuda.get_device_name(0),
        "output_shape": tuple(output.shape),
        "backward": "ok",
        "wandb": wandb.__version__,
    }
)
