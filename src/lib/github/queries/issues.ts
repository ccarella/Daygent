import { gql } from '@apollo/client';

export const GET_ISSUES = gql`
  query GetIssues(
    $owner: String!
    $name: String!
    $first: Int!
    $after: String
    $states: [IssueState!]
    $orderBy: IssueOrder
  ) {
    repository(owner: $owner, name: $name) {
      id
      issues(
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
          bodyHTML
          state
          stateReason
          url
          createdAt
          updatedAt
          closedAt
          author {
            login
            avatarUrl
            url
            ... on User {
              name
            }
          }
          assignees(first: 10) {
            totalCount
            nodes {
              id
              login
              name
              avatarUrl
              url
            }
          }
          labels(first: 10) {
            totalCount
            nodes {
              id
              name
              color
              description
            }
          }
          milestone {
            id
            title
            number
            state
            dueOn
          }
          comments {
            totalCount
          }
          reactions {
            totalCount
          }
        }
      }
    }
  }
`;

export const GET_ISSUE = gql`
  query GetIssue($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      id
      issue(number: $number) {
        id
        number
        title
        body
        bodyHTML
        state
        stateReason
        url
        createdAt
        updatedAt
        closedAt
        author {
          login
          avatarUrl
          url
          ... on User {
            name
            bio
          }
        }
        assignees(first: 10) {
          totalCount
          nodes {
            id
            login
            name
            avatarUrl
            url
          }
        }
        labels(first: 10) {
          totalCount
          nodes {
            id
            name
            color
            description
          }
        }
        milestone {
          id
          title
          number
          description
          state
          dueOn
          createdAt
          closedAt
        }
        projectCards(first: 10) {
          totalCount
          nodes {
            id
            project {
              name
              url
            }
            column {
              name
            }
          }
        }
        comments(first: 100) {
          totalCount
          nodes {
            id
            body
            bodyHTML
            createdAt
            updatedAt
            author {
              login
              avatarUrl
              url
              ... on User {
                name
              }
            }
            reactions {
              totalCount
            }
          }
        }
        timelineItems(first: 100) {
          totalCount
          nodes {
            __typename
            ... on IssueComment {
              id
              body
              createdAt
              author {
                login
              }
            }
            ... on ClosedEvent {
              id
              createdAt
              actor {
                login
              }
            }
            ... on ReopenedEvent {
              id
              createdAt
              actor {
                login
              }
            }
            ... on AssignedEvent {
              id
              createdAt
              actor {
                login
              }
              assignee {
                ... on User {
                  login
                }
              }
            }
            ... on UnassignedEvent {
              id
              createdAt
              actor {
                login
              }
              assignee {
                ... on User {
                  login
                }
              }
            }
            ... on LabeledEvent {
              id
              createdAt
              actor {
                login
              }
              label {
                name
                color
              }
            }
            ... on UnlabeledEvent {
              id
              createdAt
              actor {
                login
              }
              label {
                name
                color
              }
            }
          }
        }
      }
    }
  }
`;

export const SEARCH_ISSUES = gql`
  query SearchIssues(
    $query: String!
    $first: Int!
    $after: String
    $type: SearchType!
  ) {
    search(query: $query, type: $type, first: $first, after: $after) {
      issueCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        ... on Issue {
          id
          number
          title
          body
          state
          url
          createdAt
          updatedAt
          closedAt
          repository {
            nameWithOwner
            url
          }
          author {
            login
            avatarUrl
          }
          assignees(first: 5) {
            nodes {
              login
              avatarUrl
            }
          }
          labels(first: 5) {
            nodes {
              name
              color
            }
          }
          comments {
            totalCount
          }
        }
      }
    }
  }
`;