import { gql } from '@apollo/client';

export const GET_REPOSITORY = gql`
  query GetRepository($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      id
      name
      nameWithOwner
      description
      url
      homepageUrl
      isPrivate
      isArchived
      isFork
      isTemplate
      stargazerCount
      forkCount
      primaryLanguage {
        name
        color
      }
      defaultBranchRef {
        name
      }
      createdAt
      updatedAt
      pushedAt
      owner {
        id
        login
        avatarUrl
        url
        ... on User {
          name
        }
        ... on Organization {
          name
        }
      }
      licenseInfo {
        name
        spdxId
      }
      issues(first: 100, states: OPEN) {
        totalCount
        nodes {
          id
          number
          title
          state
          createdAt
          updatedAt
        }
      }
      pullRequests(first: 100, states: OPEN) {
        totalCount
        nodes {
          id
          number
          title
          state
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const LIST_USER_REPOSITORIES = gql`
  query ListUserRepositories(
    $first: Int!
    $after: String
    $orderBy: RepositoryOrder
  ) {
    viewer {
      repositories(
        first: $first
        after: $after
        orderBy: $orderBy
        affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
      ) {
        totalCount
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        nodes {
          id
          name
          nameWithOwner
          description
          url
          isPrivate
          isArchived
          primaryLanguage {
            name
            color
          }
          stargazerCount
          updatedAt
          pushedAt
          owner {
            id
            login
            avatarUrl
          }
        }
      }
    }
  }
`;

export const SEARCH_REPOSITORIES = gql`
  query SearchRepositories(
    $query: String!
    $first: Int!
    $after: String
    $type: SearchType!
  ) {
    search(query: $query, type: $type, first: $first, after: $after) {
      repositoryCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        ... on Repository {
          id
          name
          nameWithOwner
          description
          url
          isPrivate
          isArchived
          primaryLanguage {
            name
            color
          }
          stargazerCount
          updatedAt
          pushedAt
          owner {
            id
            login
            avatarUrl
          }
        }
      }
    }
  }
`;

export const GET_REPOSITORY_COLLABORATORS = gql`
  query GetRepositoryCollaborators(
    $owner: String!
    $name: String!
    $first: Int!
    $after: String
  ) {
    repository(owner: $owner, name: $name) {
      id
      collaborators(first: $first, after: $after) {
        totalCount
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        nodes {
          id
          login
          name
          avatarUrl
          url
        }
      }
    }
  }
`;