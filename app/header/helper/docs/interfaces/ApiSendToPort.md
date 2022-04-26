[Helper Interfaces](../README.md) / ApiSendToPort

# Interface: ApiSendToPort

## Callable

### ApiSendToPort

▸ **ApiSendToPort**(`name`, `port`, `data`): `Promise`<`number`\>

Send new data to a port. If no component is listening, the data will NOT be stored in the application.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"sendtoport"`` | Method name |
| `port` | `number` | Port to send the data to |
| `data` | `any` | Data to be sent to the port |

#### Returns

`Promise`<`number`\>

A Promise that resolves to the number of components listening to the port
