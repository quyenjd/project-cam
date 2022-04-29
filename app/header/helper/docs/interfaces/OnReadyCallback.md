[Helper Interfaces](../README.md) / OnReadyCallback

# Interface: OnReadyCallback

## Callable

### OnReadyCallback

▸ **OnReadyCallback**(`event`, `api`, `destroy`): `void`

The function that will be called after the Helper is initialized

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `event` | [`TEvent`](TEvent.md) | The event instance used to catch events triggered by the application |
| `api` | [`TApi`](TApi.md) | The API instance used to fetch events/requests to the application |
| `destroy` | () => `void` | Destroy the connection with the application |

#### Returns

`void`
