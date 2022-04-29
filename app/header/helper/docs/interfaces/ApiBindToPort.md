[Helper Interfaces](../README.md) / ApiBindToPort

# Interface: ApiBindToPort

## Callable

### ApiBindToPort

▸ **ApiBindToPort**(`name`, `port`): `Promise`<`boolean`\>

Bind the component to a port. To have a function called upon data changes to the port,
use `event.bind('port.[YOUR PORT]', callback)`.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"bindtoport"`` | Method name |
| `port` | `number` | Port to bind the component to |

#### Returns

`Promise`<`boolean`\>

A Promise that resolves to a boolean indicating whether the component has successfully bound to the port
