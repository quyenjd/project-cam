[Helper Interfaces](../README.md) / ApiComponentAddInputParam

# Interface: ApiComponentAddInputParam

## Callable

### ApiComponentAddInputParam

▸ **ApiComponentAddInputParam**(`name`, `param`, `options?`): `Promise`<`boolean`\>

Add an input parameter to the component

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"componentaddinputparam"`` | Method name |
| `param` | `string` | Name of the parameter |
| `options?` | `Object` | Options of the parameter |
| `options.limit?` | `number` | - |
| `options.required?` | `boolean` | - |
| `options.type?` | `string` | - |

#### Returns

`Promise`<`boolean`\>

A Promise that resolves to true if the parameter has been added, or false otherwise
