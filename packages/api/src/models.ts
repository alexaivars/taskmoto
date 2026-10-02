export interface User {
  __typename: 'User';
  id: string;
  username: string;
}
export interface TimeEntry {
  __typename: 'TimeEntry';
  id: string;
  minutes: number;
  name: string;
}
