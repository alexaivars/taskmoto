import { Children, FunctionComponent, ReactElement } from 'react';
import styled from 'styled-components';
import { Button, Icon } from 'ui';
import { background } from './styles';

type ListProps = {
  className?: string;
  children: {
    render: (props: { index: number }) => ReactElement;
    remove: (props: { index: number }) => void | undefined;
  };
  items: { id: string; name: string; [key: string]: unknown }[];
};

const ListItem = styled.li`
  border-radius: 0.25rem;
  padding: 1rem;
  display: flex;
  ${({ theme }) => background(theme.primary, true)}

  & + & {
    margin-top: 0.5rem;
  }
`;

const ListItemContent = styled.div`
  margin-right: auto;
  &:not(:last-child) {
    padding-right: 1rem;
  }
`;
const ListItemActions = styled.div`
  & > * {
    display: inline-block;
  }
  & > * + * {
    margin-left: 0.5rem;
  }
  min-width: ${({ children }) =>
    Children.toArray(children).length * 3 - 0.5}rem;
`;

export const ListElement = ({
  className,
  children,
  items,
}: ListProps): ReactElement<'ul'> => {
  const hasActions = Boolean(children.remove);

  return (
    <ul className={className}>
      {children &&
        items.map((item, index) => (
          <ListItem key={item.id}>
            <ListItemContent>{children.render({ index })}</ListItemContent>
            {hasActions && (
              <ListItemActions>
                {Boolean(children.remove) && (
                  <Button
                    onClick={() => children.remove({ index })}
                    icon={<Icon.Remove title={`Delete ${item.name}`} />}
                  />
                )}
              </ListItemActions>
            )}
          </ListItem>
        ))}
    </ul>
  );
};

export const List = styled<FunctionComponent<ListProps>>(
  ListElement
)<ListProps>``;

export default List;
