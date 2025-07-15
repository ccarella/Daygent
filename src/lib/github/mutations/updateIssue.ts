import { gql } from "@apollo/client";

export const UPDATE_ISSUE = gql`
  mutation UpdateIssue($input: UpdateIssueInput!) {
    updateIssue(input: $input) {
      issue {
        id
        number
        title
        body
        state
        url
        updatedAt
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

export const CLOSE_ISSUE = gql`
  mutation CloseIssue($input: CloseIssueInput!) {
    closeIssue(input: $input) {
      issue {
        id
        number
        state
        stateReason
        closedAt
      }
    }
  }
`;

export const REOPEN_ISSUE = gql`
  mutation ReopenIssue($input: ReopenIssueInput!) {
    reopenIssue(input: $input) {
      issue {
        id
        number
        state
        updatedAt
      }
    }
  }
`;

export const UPDATE_ISSUE_COMMENT = gql`
  mutation UpdateIssueComment($input: UpdateIssueCommentInput!) {
    updateIssueComment(input: $input) {
      issueComment {
        id
        body
        updatedAt
        lastEditedAt
      }
    }
  }
`;

export const DELETE_ISSUE_COMMENT = gql`
  mutation DeleteIssueComment($input: DeleteIssueCommentInput!) {
    deleteIssueComment(input: $input) {
      clientMutationId
    }
  }
`;

export const LOCK_ISSUE = gql`
  mutation LockIssue($input: LockLockableInput!) {
    lockLockable(input: $input) {
      lockedRecord {
        ... on Issue {
          id
          locked
          activeLockReason
        }
      }
    }
  }
`;

export const UNLOCK_ISSUE = gql`
  mutation UnlockIssue($input: UnlockLockableInput!) {
    unlockLockable(input: $input) {
      unlockedRecord {
        ... on Issue {
          id
          locked
        }
      }
    }
  }
`;

export const TRANSFER_ISSUE = gql`
  mutation TransferIssue($input: TransferIssueInput!) {
    transferIssue(input: $input) {
      issue {
        id
        number
        url
        repository {
          nameWithOwner
        }
      }
    }
  }
`;
