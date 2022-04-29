[Helper Interfaces](../README.md) / ApiRunFile

# Interface: ApiRunFile

## Callable

### ApiRunFile

▸ **ApiRunFile**(`name`, `dir`, `options?`): `Promise`<[`ApiRunResponse`](ApiRunResponse.md)\>

Run a JavaScript file in a child_process

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"runfile"`` | Method name |
| `dir` | `string` | Directory of the file (must be inside the component folder) |
| `options?` | [`ApiRunFileOptions`](ApiRunFileOptions.md) | Running options |

#### Returns

`Promise`<[`ApiRunResponse`](ApiRunResponse.md)\>

A Promise that resolves when the running process is done
