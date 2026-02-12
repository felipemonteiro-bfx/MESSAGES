/**
 * Helpers para mockar Supabase em testes
 */

export function createMockSupabaseResponse(data: any, error: any = null) {
  return {
    data,
    error,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  };
}

export function createMockSupabaseClient(mockData: Record<string, any[]>) {
  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          ilike: (column: string, pattern: string) => ({
            limit: (count: number) => ({
              data: mockData[table]?.filter((item: any) => 
                item[column]?.toLowerCase().includes(pattern.replace(/%/g, '').toLowerCase())
              ).slice(0, count) || [],
              error: null,
            }),
            data: mockData[table]?.filter((item: any) => item[column] === value) || [],
            error: null,
          }),
          data: mockData[table]?.filter((item: any) => item[column] === value) || [],
          error: null,
        }),
        data: mockData[table] || [],
        error: null,
      }),
      insert: (values: any) => ({
        select: () => ({
          single: () => ({
            data: { ...values, id: `new-${Date.now()}` },
            error: null,
          }),
          data: [{ ...values, id: `new-${Date.now()}` }],
          error: null,
        }),
        data: { ...values, id: `new-${Date.now()}` },
        error: null,
      }),
      update: (values: any) => ({
        eq: (column: string, value: any) => ({
          data: mockData[table]?.map((item: any) => 
            item[column] === value ? { ...item, ...values } : item
          ) || [],
          error: null,
        }),
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          data: mockData[table]?.filter((item: any) => item[column] !== value) || [],
          error: null,
        }),
      }),
    }),
    auth: {
      getUser: () => ({
        data: {
          user: {
            id: 'test-user-1',
            email: 'test@example.com',
          },
        },
        error: null,
      }),
      getSession: () => ({
        data: {
          session: {
            user: {
              id: 'test-user-1',
              email: 'test@example.com',
            },
          },
        },
        error: null,
      }),
    },
  };
}
