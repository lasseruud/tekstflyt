import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listDocuments, getDocument, createDocument, updateDocument,
  deleteDocument, generateText, finalizeDocument, cloneDocument, emailDocument,
} from '../api/documents'
import type { CreateDocumentRequest, Document } from '../api/documents'

export function useDocuments(search?: string, type?: string) {
  return useQuery({
    queryKey: ['documents', search, type],
    queryFn: () => listDocuments(search, type),
  })
}

export function useDocument(id: number | undefined) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => getDocument(id!),
    enabled: !!id,
  })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDocumentRequest) => createDocument(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Document> }) => updateDocument(id, data),
    onSuccess: (doc) => {
      qc.setQueryData(['documents', doc.id], doc)
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useGenerateText() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, prompt }: { id: number; prompt?: string }) => generateText(id, prompt),
    onSuccess: (doc) => {
      qc.setQueryData(['documents', doc.id], doc)
    },
  })
}

export function useFinalizeDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => finalizeDocument(id),
    onSuccess: (doc) => {
      qc.setQueryData(['documents', doc.id], doc)
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useCloneDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => cloneDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useEmailDocument() {
  return useMutation({
    mutationFn: (id: number) => emailDocument(id),
  })
}
