[Helper Interfaces](../README.md) / ApiReadFileFrom

# Interface: ApiReadFileFrom

## Callable

### ApiReadFileFrom

▸ **ApiReadFileFrom**(`name`, `multiple?`, `encoding?`, `title?`, `fileExt?`): `Promise`<``null`` \| [`FileData`](FileData.md) \| [`FileData`](FileData.md)[]\>

Launch a dialog to ask user where the file is then read the content of it

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"readfilefrom"`` | Method name |
| `multiple?` | `boolean` | true to allow reading multiple files, false (default) otherwise |
| `encoding?` | `string` | Specify how to read the file properly (default to `utf8`) |
| `title?` | `string` | Title of the dialog (default to `Open File...`) |
| `fileExt?` | [`FileExtension`](FileExtension.md)[] | Extensions shown in the dialog |

#### Returns

`Promise`<``null`` \| [`FileData`](FileData.md) \| [`FileData`](FileData.md)[]\>

A Promise that resolves to the selected file(s),
or null if the user cancels or the file cannot be read
