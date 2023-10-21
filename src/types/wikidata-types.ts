export namespace wikidata {
  export interface SimplifiedEntity {
    id: string
    type: string
    modified: Date
    labels?: Descriptions
    descriptions?: Descriptions
    aliases?: any
    claims: Claims
    sitelinks: Sitelinks
  }

  export interface Claims {
    [key: string]: Claim[]
  }

  export interface Claim {
    value: string
    qualifiers: Record<string, string[] | number[]>
    references: Record<string, string[]>[]
  }

  export type Descriptions = Record<string, string>
  export type Sitelinks = Record<string, string>
}
