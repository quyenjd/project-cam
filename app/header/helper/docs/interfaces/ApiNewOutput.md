[Helper Interfaces](../README.md) / ApiNewOutput

# Interface: ApiNewOutput

## Callable

### ApiNewOutput

▸ **ApiNewOutput**(`name`, `output`): `Promise`<`void`\>

Send new output to the application

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"newoutput"`` | Method name |
| `output` | `Record`<`string`, `any`\> | New output to merge with the current output of the component |

#### Returns

`Promise`<`void`\>

A Promise that resolves when the method finishes
