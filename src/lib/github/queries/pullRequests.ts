import { gql } from '@apollo/client';

export const GET_PULL_REQUESTS = gql`
  query GetPullRequests(
    $owner: String!
    $name: String!
    $first: Int!
    $after: String
    $states: [PullRequestState!]
    $orderBy: IssueOrder
  ) {
    repository(owner: $owner, name: $name) {
      id
      pullRequests(
        first: $first
        after: $after
        states: $states
        orderBy: $orderBy
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
          number
          title
          body
          state
          url
          createdAt
          updatedAt
          closedAt
          mergedAt
          isDraft
          author {
            login
            avatarUrl
            url
          }
          headRefName
          baseRefName
          mergeable
          additions
          deletions
          changedFiles
          reviewDecision
          reviews {
            totalCount
          }
          comments {
            totalCount
          }
          commits {
            totalCount
          }
        }
      }
    }
  }
`;

export const GET_PULL_REQUEST = gql`
  query GetPullRequest($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      id
      pullRequest(number: $number) {
        id
        number
        title
        body
        bodyHTML
        state
        url
        createdAt
        updatedAt
        closedAt
        mergedAt
        isDraft
        locked
        maintainerCanModify
        author {
          login
          avatarUrl
          url
          ... on User {
            name
            bio
          }
        }
        headRefName
        headRefOid
        headRepository {
          nameWithOwner
          url
        }
        baseRefName
        baseRefOid
        baseRepository {
          nameWithOwner
          url
        }
        mergeable
        mergeStateStatus
        additions
        deletions
        changedFiles
        reviewDecision
        assignees(first: 10) {
          nodes {
            login
            avatarUrl
            url
          }
        }
        labels(first: 10) {
          nodes {
            name
            color
            description
          }
        }
        milestone {
          title
          number
          state
        }
        reviews(first: 50) {
          totalCount
          nodes {
            id
            state
            body
            createdAt
            author {
              login
              avatarUrl
            }
          }
        }
        comments(first: 100) {
          totalCount
          nodes {
            id
            body
            createdAt
            author {
              login
              avatarUrl
            }
          }
        }
        commits(first: 100) {
          totalCount
          nodes {
            commit {
              oid
              message
              author {
                name
                email
                date
              }
            }
          }
        }
        files(first: 100) {
          totalCount
          nodes {
            path
            additions
            deletions
            changeType
          }
        }
      }
    }
  }
`;