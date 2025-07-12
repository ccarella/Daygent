import { describe, it, expect } from 'vitest';
import { print } from 'graphql';
import {
  GET_REPOSITORY,
  LIST_USER_REPOSITORIES,
  SEARCH_REPOSITORIES,
  GET_REPOSITORY_COLLABORATORS,
} from '../queries/repository';
import {
  GET_ISSUES,
  GET_ISSUE,
  SEARCH_ISSUES,
} from '../queries/issues';
import {
  GET_PULL_REQUESTS,
  GET_PULL_REQUEST,
} from '../queries/pullRequests';
import {
  CREATE_ISSUE,
  ADD_ASSIGNEES_TO_ISSUE,
  REMOVE_ASSIGNEES_FROM_ISSUE,
  ADD_LABELS_TO_ISSUE,
  REMOVE_LABELS_FROM_ISSUE,
  ADD_COMMENT_TO_ISSUE,
} from '../mutations/createIssue';
import {
  UPDATE_ISSUE,
  CLOSE_ISSUE,
  REOPEN_ISSUE,
  UPDATE_ISSUE_COMMENT,
  DELETE_ISSUE_COMMENT,
  LOCK_ISSUE,
  UNLOCK_ISSUE,
  TRANSFER_ISSUE,
} from '../mutations/updateIssue';

describe('GraphQL Queries', () => {
  describe('Repository Queries', () => {
    it('should have valid GET_REPOSITORY query', () => {
      const queryString = print(GET_REPOSITORY);
      expect(queryString).toContain('query GetRepository');
      expect(queryString).toContain('$owner: String!');
      expect(queryString).toContain('$name: String!');
      expect(queryString).toContain('repository(owner: $owner, name: $name)');
    });

    it('should have valid LIST_USER_REPOSITORIES query', () => {
      const queryString = print(LIST_USER_REPOSITORIES);
      expect(queryString).toContain('query ListUserRepositories');
      expect(queryString).toContain('$first: Int!');
      expect(queryString).toContain('$after: String');
      expect(queryString).toContain('viewer {');
      expect(queryString).toContain('repositories(');
    });

    it('should have valid SEARCH_REPOSITORIES query', () => {
      const queryString = print(SEARCH_REPOSITORIES);
      expect(queryString).toContain('query SearchRepositories');
      expect(queryString).toContain('$query: String!');
      expect(queryString).toContain('search(query: $query');
    });

    it('should have valid GET_REPOSITORY_COLLABORATORS query', () => {
      const queryString = print(GET_REPOSITORY_COLLABORATORS);
      expect(queryString).toContain('query GetRepositoryCollaborators');
      expect(queryString).toContain('collaborators(');
    });
  });

  describe('Issue Queries', () => {
    it('should have valid GET_ISSUES query', () => {
      const queryString = print(GET_ISSUES);
      expect(queryString).toContain('query GetIssues');
      expect(queryString).toContain('$states: [IssueState!]');
      expect(queryString).toContain('issues(');
      expect(queryString).toContain('assignees(first: 10)');
      expect(queryString).toContain('labels(first: 10)');
    });

    it('should have valid GET_ISSUE query', () => {
      const queryString = print(GET_ISSUE);
      expect(queryString).toContain('query GetIssue');
      expect(queryString).toContain('$number: Int!');
      expect(queryString).toContain('issue(number: $number)');
      expect(queryString).toContain('comments(first: 100)');
      expect(queryString).toContain('timelineItems(first: 100)');
    });

    it('should have valid SEARCH_ISSUES query', () => {
      const queryString = print(SEARCH_ISSUES);
      expect(queryString).toContain('query SearchIssues');
      expect(queryString).toContain('... on Issue');
      expect(queryString).toContain('repository {');
    });
  });

  describe('Pull Request Queries', () => {
    it('should have valid GET_PULL_REQUESTS query', () => {
      const queryString = print(GET_PULL_REQUESTS);
      expect(queryString).toContain('query GetPullRequests');
      expect(queryString).toContain('pullRequests(');
      expect(queryString).toContain('mergeable');
      expect(queryString).toContain('reviewDecision');
    });

    it('should have valid GET_PULL_REQUEST query', () => {
      const queryString = print(GET_PULL_REQUEST);
      expect(queryString).toContain('query GetPullRequest');
      expect(queryString).toContain('pullRequest(number: $number)');
      expect(queryString).toContain('reviews(first: 50)');
      expect(queryString).toContain('files(first: 100)');
    });
  });
});

describe('GraphQL Mutations', () => {
  describe('Create Issue Mutations', () => {
    it('should have valid CREATE_ISSUE mutation', () => {
      const mutationString = print(CREATE_ISSUE);
      expect(mutationString).toContain('mutation CreateIssue');
      expect(mutationString).toContain('$input: CreateIssueInput!');
      expect(mutationString).toContain('createIssue(input: $input)');
    });

    it('should have valid ADD_ASSIGNEES_TO_ISSUE mutation', () => {
      const mutationString = print(ADD_ASSIGNEES_TO_ISSUE);
      expect(mutationString).toContain('mutation AddAssigneesToIssue');
      expect(mutationString).toContain('addAssigneesToAssignable(input: $input)');
    });

    it('should have valid REMOVE_ASSIGNEES_FROM_ISSUE mutation', () => {
      const mutationString = print(REMOVE_ASSIGNEES_FROM_ISSUE);
      expect(mutationString).toContain('mutation RemoveAssigneesFromIssue');
      expect(mutationString).toContain('removeAssigneesFromAssignable(input: $input)');
    });

    it('should have valid ADD_LABELS_TO_ISSUE mutation', () => {
      const mutationString = print(ADD_LABELS_TO_ISSUE);
      expect(mutationString).toContain('mutation AddLabelsToIssue');
      expect(mutationString).toContain('addLabelsToLabelable(input: $input)');
    });

    it('should have valid REMOVE_LABELS_FROM_ISSUE mutation', () => {
      const mutationString = print(REMOVE_LABELS_FROM_ISSUE);
      expect(mutationString).toContain('mutation RemoveLabelsFromIssue');
      expect(mutationString).toContain('removeLabelsFromLabelable(input: $input)');
    });

    it('should have valid ADD_COMMENT_TO_ISSUE mutation', () => {
      const mutationString = print(ADD_COMMENT_TO_ISSUE);
      expect(mutationString).toContain('mutation AddCommentToIssue');
      expect(mutationString).toContain('addComment(input: $input)');
    });
  });

  describe('Update Issue Mutations', () => {
    it('should have valid UPDATE_ISSUE mutation', () => {
      const mutationString = print(UPDATE_ISSUE);
      expect(mutationString).toContain('mutation UpdateIssue');
      expect(mutationString).toContain('updateIssue(input: $input)');
    });

    it('should have valid CLOSE_ISSUE mutation', () => {
      const mutationString = print(CLOSE_ISSUE);
      expect(mutationString).toContain('mutation CloseIssue');
      expect(mutationString).toContain('closeIssue(input: $input)');
    });

    it('should have valid REOPEN_ISSUE mutation', () => {
      const mutationString = print(REOPEN_ISSUE);
      expect(mutationString).toContain('mutation ReopenIssue');
      expect(mutationString).toContain('reopenIssue(input: $input)');
    });

    it('should have valid UPDATE_ISSUE_COMMENT mutation', () => {
      const mutationString = print(UPDATE_ISSUE_COMMENT);
      expect(mutationString).toContain('mutation UpdateIssueComment');
      expect(mutationString).toContain('updateIssueComment(input: $input)');
    });

    it('should have valid DELETE_ISSUE_COMMENT mutation', () => {
      const mutationString = print(DELETE_ISSUE_COMMENT);
      expect(mutationString).toContain('mutation DeleteIssueComment');
      expect(mutationString).toContain('deleteIssueComment(input: $input)');
    });

    it('should have valid LOCK_ISSUE mutation', () => {
      const mutationString = print(LOCK_ISSUE);
      expect(mutationString).toContain('mutation LockIssue');
      expect(mutationString).toContain('lockLockable(input: $input)');
    });

    it('should have valid UNLOCK_ISSUE mutation', () => {
      const mutationString = print(UNLOCK_ISSUE);
      expect(mutationString).toContain('mutation UnlockIssue');
      expect(mutationString).toContain('unlockLockable(input: $input)');
    });

    it('should have valid TRANSFER_ISSUE mutation', () => {
      const mutationString = print(TRANSFER_ISSUE);
      expect(mutationString).toContain('mutation TransferIssue');
      expect(mutationString).toContain('transferIssue(input: $input)');
    });
  });
});