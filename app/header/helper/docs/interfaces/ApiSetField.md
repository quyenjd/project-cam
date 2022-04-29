[Helper Interfaces](../README.md) / ApiSetField

# Interface: ApiSetField

## Callable

### ApiSetField

▸ **ApiSetField**(`name`, `key`, `value`): `Promise`<``null`` \| `string`\>

Set value of a configuration field

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"setfield"`` | Method name |
| `key` | `string` | The field to set the value of |
| `value` | `string` | New value of the field |

#### Returns

`Promise`<``null`` \| `string`\>

A Promise that resolves to the old value of the field
or null if the key has only just been set
