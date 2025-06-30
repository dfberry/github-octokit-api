// packages/sqlite-to-cosmos/src/vector-fields.ts

export function getVectorText(table: string, doc: Record<string, any>): string {
  switch (table) {
    case 'contributors':
      return [
        doc.name,
        doc.bio,
        doc.company,
        doc.blog,
        doc.location,
        doc.twitter,
        doc.email
      ].filter(Boolean).join(' | ');
    case 'repositories':
      return [
        doc.name,
        doc.description,
        doc.primaryLanguage,
        doc.topics,
        doc.readme,
        doc.licenseInfo
      ].filter(Boolean).join(' | ');
    case 'workflows':
      return [
        doc.name,
        doc.path,
        doc.state
      ].filter(Boolean).join(' | ');
    case 'contributor_issue_pr':
      return [
        doc.title,
        doc.body,
        doc.state,
        doc.org,
        doc.repo
      ].filter(Boolean).join(' | ');
    case 'dependabot_alerts':
      return [
        doc.summary,
        doc.description,
        doc.dependency_name,
        doc.dependency_ecosystem,
        doc.severity,
        doc.cve_id,
        doc.ghsa_id,
        doc.vulnerable_version_range,
        doc.first_patched_version,
        doc.cwes
      ].filter(Boolean).join(' | ');
    case 'workflow_runs':
      return [
        doc.status,
        doc.conclusion
      ].filter(Boolean).join(' | ');
    default:
      // fallback: all string fields
      return Object.values(doc).filter(v => typeof v === 'string').join(' | ');
  }
}
