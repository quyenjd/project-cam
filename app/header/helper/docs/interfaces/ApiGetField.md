[Helper Interfaces](../README.md) / ApiGetField

# Interface: ApiGetField

## Callable

### ApiGetField

▸ **ApiGetField**(`name`, `key`): `Promise`<``null`` \| `string`\>

Get value of a configuration field

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"getfield"`` | Method name |
| `key` | `string` | The field to get the value of |

#### Returns

`Promise`<``null`` \| `string`\>

A Promise that resolves to the value of the field or null if the key has not been set
