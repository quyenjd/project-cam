[Helper Interfaces](../README.md) / ApiRunCommand

# Interface: ApiRunCommand

## Callable

### ApiRunCommand

▸ **ApiRunCommand**(`name`, `command`, `options?`): `Promise`<[`ApiRunResponse`](ApiRunResponse.md)\>

Run a command in a child_process

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"runcommand"`` | Method name |
| `command` | `string` | The command to run |
| `options?` | [`ApiRunCommandOptions`](ApiRunCommandOptions.md) | Running options |

#### Returns

`Promise`<[`ApiRunResponse`](ApiRunResponse.md)\>

A Promise that resolves when the running process is done
