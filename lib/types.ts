/**
 * Типы таблиц БД.
 *
 * Написаны вручную по миграциям из supabase/migrations/ — генератор Supabase
 * требует живого проекта, а типы нужны уже сейчас, иначе все запросы к базе
 * нетипизированы и ошибки в именах колонок всплывают только в рантайме.
 *
 * ПОСЛЕ применения миграций к настоящему проекту файл нужно перегенерировать
 * и сверить с этим вариантом:
 *
 *   npx supabase gen types typescript --project-id <project-id> > lib/types.ts
 *
 * Если генератор выдаст что-то другое — источник правды он, а не этот файл.
 */

type Timestamp = string

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          slug: string
          name: string
          custom_domain: string | null
          plan: string
          owner_user_id: string | null
          created_at: Timestamp
        }
        Insert: {
          id?: string
          slug: string
          name: string
          custom_domain?: string | null
          plan?: string
          owner_user_id?: string | null
          created_at?: Timestamp
        }
        Update: {
          slug?: string
          name?: string
          custom_domain?: string | null
          plan?: string
          owner_user_id?: string | null
        }
        Relationships: []
      }
      tenant_members: {
        Row: {
          user_id: string
          tenant_id: string
          role: string
          created_at: Timestamp
        }
        Insert: {
          user_id: string
          tenant_id: string
          role?: string
          created_at?: Timestamp
        }
        Update: {
          role?: string
        }
        // Связь нужна не для красоты: без неё supabase-js не может вывести тип
        // вложенной выборки tenant:tenants(...) в lib/auth.ts.
        Relationships: [
          {
            foreignKeyName: 'tenant_members_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      site_settings: {
        Row: {
          tenant_id: string
          logo_url: string | null
          primary_color: string
          phone: string | null
          address: string | null
          working_hours: string | null
          socials: Record<string, string>
          about: string | null
          yandex_map_url: string | null
          updated_at: Timestamp
        }
        Insert: {
          tenant_id: string
          logo_url?: string | null
          primary_color?: string
          phone?: string | null
          address?: string | null
          working_hours?: string | null
          socials?: Record<string, string>
          about?: string | null
          yandex_map_url?: string | null
        }
        Update: {
          logo_url?: string | null
          primary_color?: string
          phone?: string | null
          address?: string | null
          working_hours?: string | null
          socials?: Record<string, string>
          about?: string | null
          yandex_map_url?: string | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          id: string
          tenant_id: string
          name: string
          sort_order: number
          created_at: Timestamp
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          sort_order?: number
        }
        Update: {
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          id: string
          tenant_id: string
          category_id: string | null
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_available: boolean
          sort_order: number
          created_at: Timestamp
        }
        Insert: {
          id?: string
          tenant_id: string
          category_id?: string | null
          name: string
          description?: string | null
          price?: number
          image_url?: string | null
          is_available?: boolean
          sort_order?: number
        }
        Update: {
          category_id?: string | null
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          is_available?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      promotions: {
        Row: {
          id: string
          tenant_id: string
          title: string
          description: string | null
          image_url: string | null
          starts_at: Timestamp | null
          ends_at: Timestamp | null
          is_active: boolean
          created_at: Timestamp
        }
        Insert: {
          id?: string
          tenant_id: string
          title: string
          description?: string | null
          image_url?: string | null
          starts_at?: Timestamp | null
          ends_at?: Timestamp | null
          is_active?: boolean
        }
        Update: {
          title?: string
          description?: string | null
          image_url?: string | null
          starts_at?: Timestamp | null
          ends_at?: Timestamp | null
          is_active?: boolean
        }
        Relationships: []
      }
      news: {
        Row: {
          id: string
          tenant_id: string
          title: string
          slug: string
          body: string | null
          cover_image_url: string | null
          is_published: boolean
          published_at: Timestamp | null
          created_at: Timestamp
        }
        Insert: {
          id?: string
          tenant_id: string
          title: string
          slug: string
          body?: string | null
          cover_image_url?: string | null
          is_published?: boolean
          published_at?: Timestamp | null
        }
        Update: {
          title?: string
          slug?: string
          body?: string | null
          cover_image_url?: string | null
          is_published?: boolean
          published_at?: Timestamp | null
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      user_tenant_ids: {
        Args: Record<never, never>
        Returns: string[]
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

/** Строка таблицы: Row<'menu_items'> */
export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
