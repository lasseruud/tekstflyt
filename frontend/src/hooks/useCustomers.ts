import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { searchCustomers, createCustomer } from '../api/customers'
import type { Customer } from '../api/customers'

export function useCustomers(query?: string) {
  return useQuery({
    queryKey: ['customers', query],
    queryFn: () => searchCustomers(query),
    enabled: query === undefined || query.length >= 2 || query === '',
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Customer>) => createCustomer(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}
