// Types for GraphQL Issue and PR nodes
export interface GraphQLRepository {
  name: string;
  owner: { login: string };
}

export interface GraphQLIssueNode {
  __typename: 'Issue';
  id: string;
  number: number;
  title: string;
  url: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  author?: { login: string } | null;
}

export interface GraphQLPullRequestNode {
  __typename: 'PullRequest';
  id: string;
  number: number;
  title: string;
  url: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  mergedAt?: string | null;
  merged?: boolean | null;
  author?: { login: string } | null;
}
export type GraphQLIssueOrPrNode = GraphQLIssueNode | GraphQLPullRequestNode;

export interface GraphQLPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface GraphQLIssuesConnection {
  nodes: GraphQLIssueNode[];
  pageInfo: GraphQLPageInfo;
}

export interface GraphQLPullRequestsConnection {
  nodes: GraphQLPullRequestNode[];
  pageInfo: GraphQLPageInfo;
}

export interface GraphQLSearchPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}
export interface GraphQLSearchResult<T> {
  nodes: T[];
  pageInfo: GraphQLSearchPageInfo;
  issueCount?: number;
}
export interface GraphQLUserIssuesAndPRs {
  user: {
    issues: GraphQLSearchResult<GraphQLIssueNode>;
    pullRequests: GraphQLSearchResult<GraphQLPullRequestNode>;
  } | null;
}
