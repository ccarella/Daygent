import { gql } from "@apollo/client";

export const CREATE_ISSUE = gql`
  mutation CreateIssue($input: CreateIssueInput!) {
    createIssue(input: $input) {
      issue {
        id
        number
        title
        body
        state
        url
        createdAt
        author {
          login
          avatarUrl
        }
        repository {
          nameWithOwner
          url
        }
        assignees(first: 10) {
          nodes {
            login
            avatarUrl
          }
        }
        labels(first: 10) {
          nodes {
            name
            color
          }
        }
        milestone {
          title
          number
        }
      }
    }
  }
`;

export const ADD_ASSIGNEES_TO_ISSUE = gql`
  mutation AddAssigneesToIssue($input: AddAssigneesToAssignableInput!) {
    addAssigneesToAssignable(input: $input) {
      assignable {
        ... on Issue {
          id
          assignees(first: 10) {
            nodes {
              login
              avatarUrl
            }
          }
        }
      }
    }
  }
`;

export const REMOVE_ASSIGNEES_FROM_ISSUE = gql`
  mutation RemoveAssigneesFromIssue(
    $input: RemoveAssigneesFromAssignableInput!
  ) {
    removeAssigneesFromAssignable(input: $input) {
      assignable {
        ... on Issue {
          id
          assignees(first: 10) {
            nodes {
              login
              avatarUrl
            }
          }
        }
      }
    }
  }
`;

export const ADD_LABELS_TO_ISSUE = gql`
  mutation AddLabelsToIssue($input: AddLabelsToLabelableInput!) {
    addLabelsToLabelable(input: $input) {
      labelable {
        ... on Issue {
          id
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
        }
      }
    }
  }
`;

export const REMOVE_LABELS_FROM_ISSUE = gql`
  mutation RemoveLabelsFromIssue($input: RemoveLabelsFromLabelableInput!) {
    removeLabelsFromLabelable(input: $input) {
      labelable {
        ... on Issue {
          id
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
        }
      }
    }
  }
`;

export const ADD_COMMENT_TO_ISSUE = gql`
  mutation AddCommentToIssue($input: AddCommentInput!) {
    addComment(input: $input) {
      commentEdge {
        node {
          id
          body
          createdAt
          author {
            login
            avatarUrl
          }
        }
      }
    }
  }
`;
