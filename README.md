cnx-bridge


## How to write a component?
Each component constructor should get following parameters:

| Param | Type | Description |
|-------|------|-------------|
| id | String | Unique CNX id |
| type | String | One of CNXML availabel telemet types |
| cnxml | JSON | Content of the element. If Component is more compoicated it can recieve a JSON string to evaluate it to more suitabel model for itself |
| props | Object | attributes that should be attached to element when convert to CNXML format|


Each component should return a common interface:

| Key | Type | Description |
|-----|------|-------------|
| id | String | cnx-legacy-identifier |
| diff | DiffTool | expose DiffTool instance |
| comment | Comment | expose Comment instance |
| outline | String | string to display inside Outliner |
| cnxml | Function | fn returning valid CNXML represesentation of the component |
| destroy | Function | cleaning fn. that can be called before removing the component |
| element | HTMLElement | reference to DOM element that will be placed inside the editor |
