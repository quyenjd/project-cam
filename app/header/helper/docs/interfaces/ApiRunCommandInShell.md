[Helper Interfaces](../README.md) / ApiRunCommandInShell

# Interface: ApiRunCommandInShell

## Callable

### ApiRunCommandInShell

▸ **ApiRunCommandInShell**(`name`, `command`, `options?`): `Promise`<[`ApiRunResponse`](ApiRunResponse.md)\>

Run a command in a shell

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"runcommandinshell"`` | Method name |
| `command` | `string` | The command to run, including space-seperated arguments |
| `options?` | [`ApiRunCommandInShellOptions`](ApiRunCommandInShellOptions.md) | Running options |

#### Returns

`Promise`<[`ApiRunResponse`](ApiRunResponse.md)\>

A Promise that resolves when the running process is done
