export interface Artifact {
  id: string
  type: 'code' | 'html' | 'markdown' | 'text' | 'image' | 'generated-image'
  title: string
  content: string
  language?: string
  metadata?: {
    prompt?: string
    model?: string
    size?: number
    dimensions?: { width: number; height: number }
  }
  createdBy: string
  createdAt: number
}

class ArtifactStore {
  private artifacts = new Map<string, Artifact>()
  
  addArtifact(artifact: Artifact): void {
    this.artifacts.set(artifact.id, artifact)
  }
  
  getArtifact(id: string): Artifact | undefined {
    return this.artifacts.get(id)
  }
  
  getAllArtifacts(): Artifact[] {
    return Array.from(this.artifacts.values())
  }
  
  deleteArtifact(id: string): void {
    this.artifacts.delete(id)
  }
  
  hasArtifact(id: string): boolean {
    return this.artifacts.has(id)
  }
}

export const artifactStore = new ArtifactStore() 