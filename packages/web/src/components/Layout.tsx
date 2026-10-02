import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { LogoutDocument, User } from 'generated/graphql';
import { ReactElement, ReactNode, useEffect } from 'react';
import { Button, Page } from 'ui';
import { useRouter } from 'next/router';

gql`
  mutation logout {
    logout {
      ... on Error {
        message
      }
    }
  }
`;

const Layout = ({
  user,
  children,
  title,
}: {
  title?: string;
  user?: User;
  children: ReactNode;
}): ReactElement => {
  const router = useRouter();
  const [logout, { data }] = useMutation(LogoutDocument);
  const hasUser = Boolean(user?.id);

  console.log({ data });
  useEffect(() => {
    if (data) {
      router.push('/login');
    }
  }, [router, data]);
  return (
    <Page>
      <Page.Navigation>
        {hasUser && (
          <Button
            onClick={() => {
              console.log('FOO');
              logout();
            }}
            variant="neutral"
          >
            Logout
          </Button>
        )}
      </Page.Navigation>
      {title && <Page.Header title={title} />}
      <Page.Body>{children}</Page.Body>
    </Page>
  );
};

export default Layout;
