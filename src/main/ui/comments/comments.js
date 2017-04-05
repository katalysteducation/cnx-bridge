import comment from "./comment";
import {template, createElement} from "../../../utilities/travrs";
require('./comments.scss');


const comdb = [
  {
    id: 'ked-c-0',
    avatar: '#31f1ce',
    date: '2017-04-01 01:23:33',
    user: 'Gavin',
    note: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    responses: [
      {
        id: 'ked-c-1',
        avatar: '#f50546',
        date: '2017-04-01 01:23:33',
        user: 'ludekarts',
        note: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      },
      {
        id: 'ked-c-1',
        avatar: '#b605f5',
        date: '2017-04-01 01:23:33',
        user: 'Waldek',
        note: ' Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      }
    ]
  }
]

export default (function Comments () {
  const element = createElement('div.cnxb-comments');

  const addComments = (comments) => {
    comments && comments.forEach(com => element.appendChild(comment(com)));
  };


  addComments(comdb);


  // Pubic API.
  return { element };
}())
