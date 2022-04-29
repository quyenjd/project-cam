[Helper Interfaces](../README.md) / ApiComponentAddOutputParam

# Interface: ApiComponentAddOutputParam

## Callable

### ApiComponentAddOutputParam

▸ **ApiComponentAddOutputParam**(`name`, `param`, `options?`): `Promise`<`boolean`\>

Add an output parameter to the component

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"componentaddoutputparam"`` | Method name |
| `param` | `string` | Name of the parameter |
| `options?` | `Object` | Options of the parameter |
| `options.type?` | `string` | - |

#### Returns

`Promise`<`boolean`\>

A Promise that resolves to true if the parameter has been added, or false otherwise
