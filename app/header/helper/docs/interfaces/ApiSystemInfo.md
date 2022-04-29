[Helper Interfaces](../README.md) / ApiSystemInfo

# Interface: ApiSystemInfo

## Callable

### ApiSystemInfo

▸ **ApiSystemInfo**(`name`, `valueObject`): `Promise`<`any`\>

Get all kinds of system information using `systeminformation`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"systeminfo"`` | Method name |
| `valueObject` | `any` | Parameter to `si.get()`. Information on how to use this can be found here: https://systeminformation.io/general.html |

#### Returns

`Promise`<`any`\>

Return value from `si.get()`
