[Helper Interfaces](../README.md) / ApiConfirm

# Interface: ApiConfirm

## Callable

### ApiConfirm

▸ **ApiConfirm**(`name`, `message?`): `Promise`<`boolean`\>

Launch a confirmation box on the application

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"confirm"`` | Method name |
| `message?` | `string` | Confirmation prompt |

#### Returns

`Promise`<`boolean`\>

A Promise that resolves when the confirmation box is closed.
Return value `true` means user chooses OK, otherwise `false` if user chooses Cancel.
