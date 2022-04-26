[Helper Interfaces](../README.md) / EventPort

# Interface: EventPort

## Callable

### EventPort

▸ **EventPort**(`name`, `listener`): `void`

Triggered when the data of the port that the component is bound to changes

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | Event name (starting with `port.`, following by the port) |
| `listener` | [`EventPortListener`](EventPortListener.md) | Event listener |

#### Returns

`void`
