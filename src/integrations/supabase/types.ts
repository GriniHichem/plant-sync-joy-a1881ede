export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_secret: boolean
          key: string
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          key: string
          label?: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          key?: string
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          code: string
          code_erp: string | null
          created_at: string
          description: string | null
          designation: string
          family_id: string | null
          fournisseur: string | null
          id: string
          is_active: boolean
          prix_unitaire: number | null
          stock_actuel: number
          stock_min: number
          unite: string
          updated_at: string
        }
        Insert: {
          code: string
          code_erp?: string | null
          created_at?: string
          description?: string | null
          designation: string
          family_id?: string | null
          fournisseur?: string | null
          id?: string
          is_active?: boolean
          prix_unitaire?: number | null
          stock_actuel?: number
          stock_min?: number
          unite?: string
          updated_at?: string
        }
        Update: {
          code?: string
          code_erp?: string | null
          created_at?: string
          description?: string | null
          designation?: string
          family_id?: string | null
          fournisseur?: string | null
          id?: string
          is_active?: boolean
          prix_unitaire?: number | null
          stock_actuel?: number
          stock_min?: number
          unite?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      consumptions: {
        Row: {
          article_id: string
          created_at: string
          declared_by: string | null
          id: string
          notes: string | null
          of_id: string
          quantite: number
          shift_id: string | null
          unite: string
        }
        Insert: {
          article_id: string
          created_at?: string
          declared_by?: string | null
          id?: string
          notes?: string | null
          of_id: string
          quantite?: number
          shift_id?: string | null
          unite?: string
        }
        Update: {
          article_id?: string
          created_at?: string
          declared_by?: string | null
          id?: string
          notes?: string | null
          of_id?: string
          quantite?: number
          shift_id?: string | null
          unite?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumptions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumptions_of_id_fkey"
            columns: ["of_id"]
            isOneToOne: false
            referencedRelation: "ordres_fabrication"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumptions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          document_id: string | null
          document_name: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          document_id?: string | null
          document_name?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          document_id?: string | null
          document_name?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_audit_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "entity_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      document_permissions: {
        Row: {
          can_delete: boolean
          can_download: boolean
          can_edit_metadata: boolean
          can_upload: boolean
          can_view: boolean
          created_at: string
          entity_type: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          can_delete?: boolean
          can_download?: boolean
          can_edit_metadata?: boolean
          can_upload?: boolean
          can_view?: boolean
          created_at?: string
          entity_type: string
          id?: string
          role: string
          updated_at?: string
        }
        Update: {
          can_delete?: boolean
          can_download?: boolean
          can_edit_metadata?: boolean
          can_upload?: boolean
          can_view?: boolean
          created_at?: string
          entity_type?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      entity_documents: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number
          file_type: string | null
          file_url: string
          id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: string
          file_name?: string
          file_size?: number
          file_type?: string | null
          file_url: string
          id?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number
          file_type?: string | null
          file_url?: string
          id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_images: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number
          id: string
          image_url: string
          is_primary: boolean
          sort_order: number
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name?: string
          file_size?: number
          id?: string
          image_url: string
          is_primary?: boolean
          sort_order?: number
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          sort_order?: number
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      equipements: {
        Row: {
          code: string
          created_at: string
          criticite: Database["public"]["Enums"]["criticite"]
          criticite_maintenance:
            | Database["public"]["Enums"]["criticite_maintenance"]
            | null
          date_mise_en_service: string | null
          description: string | null
          designation: string
          family_id: string | null
          id: string
          is_active: boolean
          line_id: string | null
          localisation: string | null
          machine_id: string | null
          marque: string | null
          modele: string | null
          numero_serie: string | null
          role_fonctionnel:
            | Database["public"]["Enums"]["role_fonctionnel"]
            | null
          statut: Database["public"]["Enums"]["equipement_statut"]
          type: Database["public"]["Enums"]["equipement_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          criticite?: Database["public"]["Enums"]["criticite"]
          criticite_maintenance?:
            | Database["public"]["Enums"]["criticite_maintenance"]
            | null
          date_mise_en_service?: string | null
          description?: string | null
          designation: string
          family_id?: string | null
          id?: string
          is_active?: boolean
          line_id?: string | null
          localisation?: string | null
          machine_id?: string | null
          marque?: string | null
          modele?: string | null
          numero_serie?: string | null
          role_fonctionnel?:
            | Database["public"]["Enums"]["role_fonctionnel"]
            | null
          statut?: Database["public"]["Enums"]["equipement_statut"]
          type?: Database["public"]["Enums"]["equipement_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          criticite?: Database["public"]["Enums"]["criticite"]
          criticite_maintenance?:
            | Database["public"]["Enums"]["criticite_maintenance"]
            | null
          date_mise_en_service?: string | null
          description?: string | null
          designation?: string
          family_id?: string | null
          id?: string
          is_active?: boolean
          line_id?: string | null
          localisation?: string | null
          machine_id?: string | null
          marque?: string | null
          modele?: string | null
          numero_serie?: string | null
          role_fonctionnel?:
            | Database["public"]["Enums"]["role_fonctionnel"]
            | null
          statut?: Database["public"]["Enums"]["equipement_statut"]
          type?: Database["public"]["Enums"]["equipement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipements_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "machine_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipements_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipements_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_pdr: {
        Row: {
          created_at: string
          id: string
          intervention_id: string
          pdr_id: string
          quantite: number
        }
        Insert: {
          created_at?: string
          id?: string
          intervention_id: string
          pdr_id: string
          quantite?: number
        }
        Update: {
          created_at?: string
          id?: string
          intervention_id?: string
          pdr_id?: string
          quantite?: number
        }
        Relationships: [
          {
            foreignKeyName: "intervention_pdr_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_pdr_pdr_id_fkey"
            columns: ["pdr_id"]
            isOneToOne: false
            referencedRelation: "pdr"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          created_at: string
          date_debut: string
          date_fin: string | null
          description: string
          id: string
          notes: string | null
          statut: Database["public"]["Enums"]["intervention_statut"]
          technicien_id: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          description?: string
          id?: string
          notes?: string | null
          statut?: Database["public"]["Enums"]["intervention_statut"]
          technicien_id: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          description?: string
          id?: string
          notes?: string | null
          statut?: Database["public"]["Enums"]["intervention_statut"]
          technicien_id?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      line_products: {
        Row: {
          created_at: string
          id: string
          line_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          line_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_products_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_documents: {
        Row: {
          created_at: string
          description: string | null
          file_type: string | null
          file_url: string
          id: string
          machine_id: string
          name: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          machine_id: string
          name: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          machine_id?: string
          name?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_documents_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_families: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_families_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "machine_families"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_line_assignments: {
        Row: {
          created_at: string
          id: string
          line_id: string
          machine_id: string
          priority: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_id: string
          machine_id: string
          priority?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          line_id?: string
          machine_id?: string
          priority?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "machine_line_assignments_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_line_assignments_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_pdr: {
        Row: {
          created_at: string
          id: string
          machine_id: string
          pdr_id: string
          quantite_recommandee: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          machine_id: string
          pdr_id: string
          quantite_recommandee?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          machine_id?: string
          pdr_id?: string
          quantite_recommandee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_pdr_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_pdr_pdr_id_fkey"
            columns: ["pdr_id"]
            isOneToOne: false
            referencedRelation: "pdr"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          code: string
          created_at: string
          criticite: Database["public"]["Enums"]["criticite"]
          criticite_maintenance:
            | Database["public"]["Enums"]["criticite_maintenance"]
            | null
          date_mise_en_service: string | null
          description: string | null
          designation: string
          disponibilite_pdr:
            | Database["public"]["Enums"]["disponibilite_pdr"]
            | null
          family_id: string | null
          id: string
          impact_ligne: Database["public"]["Enums"]["impact_ligne"] | null
          is_active: boolean
          localisation: string | null
          marque: string | null
          modele: string | null
          numero_serie: string | null
          role_fonctionnel:
            | Database["public"]["Enums"]["role_fonctionnel"]
            | null
          statut: Database["public"]["Enums"]["machine_statut"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          criticite?: Database["public"]["Enums"]["criticite"]
          criticite_maintenance?:
            | Database["public"]["Enums"]["criticite_maintenance"]
            | null
          date_mise_en_service?: string | null
          description?: string | null
          designation: string
          disponibilite_pdr?:
            | Database["public"]["Enums"]["disponibilite_pdr"]
            | null
          family_id?: string | null
          id?: string
          impact_ligne?: Database["public"]["Enums"]["impact_ligne"] | null
          is_active?: boolean
          localisation?: string | null
          marque?: string | null
          modele?: string | null
          numero_serie?: string | null
          role_fonctionnel?:
            | Database["public"]["Enums"]["role_fonctionnel"]
            | null
          statut?: Database["public"]["Enums"]["machine_statut"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          criticite?: Database["public"]["Enums"]["criticite"]
          criticite_maintenance?:
            | Database["public"]["Enums"]["criticite_maintenance"]
            | null
          date_mise_en_service?: string | null
          description?: string | null
          designation?: string
          disponibilite_pdr?:
            | Database["public"]["Enums"]["disponibilite_pdr"]
            | null
          family_id?: string | null
          id?: string
          impact_ligne?: Database["public"]["Enums"]["impact_ligne"] | null
          is_active?: boolean
          localisation?: string | null
          marque?: string | null
          modele?: string | null
          numero_serie?: string | null
          role_fonctionnel?:
            | Database["public"]["Enums"]["role_fonctionnel"]
            | null
          statut?: Database["public"]["Enums"]["machine_statut"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "machine_families"
            referencedColumns: ["id"]
          },
        ]
      }
      of_mode_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_mode_id: string
          of_id: string
          old_mode_id: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_mode_id: string
          of_id: string
          old_mode_id?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_mode_id?: string
          of_id?: string
          old_mode_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "of_mode_history_new_mode_id_fkey"
            columns: ["new_mode_id"]
            isOneToOne: false
            referencedRelation: "shift_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_mode_history_of_id_fkey"
            columns: ["of_id"]
            isOneToOne: false
            referencedRelation: "ordres_fabrication"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_mode_history_old_mode_id_fkey"
            columns: ["old_mode_id"]
            isOneToOne: false
            referencedRelation: "shift_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      ordres_fabrication: {
        Row: {
          created_at: string
          created_by: string | null
          date_debut_prevue: string | null
          date_debut_reelle: string | null
          date_fin_prevue: string | null
          date_fin_reelle: string | null
          id: string
          is_active: boolean
          line_id: string | null
          numero: string
          product_id: string
          quantite_prevue: number
          quantite_produite: number
          quantite_rebut: number
          recipe_id: string | null
          shift_mode_id: string | null
          statut: Database["public"]["Enums"]["of_statut"]
          unite: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_debut_prevue?: string | null
          date_debut_reelle?: string | null
          date_fin_prevue?: string | null
          date_fin_reelle?: string | null
          id?: string
          is_active?: boolean
          line_id?: string | null
          numero: string
          product_id: string
          quantite_prevue?: number
          quantite_produite?: number
          quantite_rebut?: number
          recipe_id?: string | null
          shift_mode_id?: string | null
          statut?: Database["public"]["Enums"]["of_statut"]
          unite?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_debut_prevue?: string | null
          date_debut_reelle?: string | null
          date_fin_prevue?: string | null
          date_fin_reelle?: string | null
          id?: string
          is_active?: boolean
          line_id?: string | null
          numero?: string
          product_id?: string
          quantite_prevue?: number
          quantite_produite?: number
          quantite_rebut?: number
          recipe_id?: string | null
          shift_mode_id?: string | null
          statut?: Database["public"]["Enums"]["of_statut"]
          unite?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordres_fabrication_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_fabrication_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_fabrication_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_fabrication_shift_mode_id_fkey"
            columns: ["shift_mode_id"]
            isOneToOne: false
            referencedRelation: "shift_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_levels: {
        Row: {
          coefficient: number
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          level_order: number
          poids: number | null
          unite_name: string
        }
        Insert: {
          coefficient?: number
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          level_order?: number
          poids?: number | null
          unite_name: string
        }
        Update: {
          coefficient?: number
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          level_order?: number
          poids?: number | null
          unite_name?: string
        }
        Relationships: []
      }
      panne_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      pdr: {
        Row: {
          approvisionnement: Database["public"]["Enums"]["approvisionnement_type"]
          created_at: string
          delai_approvisionnement: number
          description: string | null
          designation: string
          devise: string
          emplacement: string | null
          family_id: string | null
          fournisseur: string | null
          id: string
          is_active: boolean
          pmp: number
          point_commande: number
          prix_unitaire: number | null
          reference: string
          statut_pdr: Database["public"]["Enums"]["statut_pdr"]
          stock_actuel: number
          stock_max: number
          stock_min: number
          stock_securite: number
          updated_at: string
        }
        Insert: {
          approvisionnement?: Database["public"]["Enums"]["approvisionnement_type"]
          created_at?: string
          delai_approvisionnement?: number
          description?: string | null
          designation: string
          devise?: string
          emplacement?: string | null
          family_id?: string | null
          fournisseur?: string | null
          id?: string
          is_active?: boolean
          pmp?: number
          point_commande?: number
          prix_unitaire?: number | null
          reference: string
          statut_pdr?: Database["public"]["Enums"]["statut_pdr"]
          stock_actuel?: number
          stock_max?: number
          stock_min?: number
          stock_securite?: number
          updated_at?: string
        }
        Update: {
          approvisionnement?: Database["public"]["Enums"]["approvisionnement_type"]
          created_at?: string
          delai_approvisionnement?: number
          description?: string | null
          designation?: string
          devise?: string
          emplacement?: string | null
          family_id?: string | null
          fournisseur?: string | null
          id?: string
          is_active?: boolean
          pmp?: number
          point_commande?: number
          prix_unitaire?: number | null
          reference?: string
          statut_pdr?: Database["public"]["Enums"]["statut_pdr"]
          stock_actuel?: number
          stock_max?: number
          stock_min?: number
          stock_securite?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdr_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "pdr_families"
            referencedColumns: ["id"]
          },
        ]
      }
      pdr_families: {
        Row: {
          approvisionnement: Database["public"]["Enums"]["approvisionnement_type"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          statut_default: Database["public"]["Enums"]["statut_pdr"]
          updated_at: string
        }
        Insert: {
          approvisionnement?: Database["public"]["Enums"]["approvisionnement_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          statut_default?: Database["public"]["Enums"]["statut_pdr"]
          updated_at?: string
        }
        Update: {
          approvisionnement?: Database["public"]["Enums"]["approvisionnement_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          statut_default?: Database["public"]["Enums"]["statut_pdr"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdr_families_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pdr_families"
            referencedColumns: ["id"]
          },
        ]
      }
      pdr_family_suppliers: {
        Row: {
          contact: string | null
          created_at: string
          delai_jours: number | null
          family_id: string
          id: string
          is_principal: boolean | null
          nom: string
          notes: string | null
          prix: number | null
          reference_fournisseur: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          delai_jours?: number | null
          family_id: string
          id?: string
          is_principal?: boolean | null
          nom: string
          notes?: string | null
          prix?: number | null
          reference_fournisseur?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          delai_jours?: number | null
          family_id?: string
          id?: string
          is_principal?: boolean | null
          nom?: string
          notes?: string | null
          prix?: number | null
          reference_fournisseur?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdr_family_suppliers_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "pdr_families"
            referencedColumns: ["id"]
          },
        ]
      }
      pdr_stock_movements: {
        Row: {
          created_at: string
          id: string
          motif: string | null
          pdr_id: string
          prix_unitaire: number | null
          quantite: number
          ref_document_erp: string | null
          reference_source: string | null
          source_id: string | null
          source_type: string | null
          stock_apres: number
          stock_avant: number
          type: Database["public"]["Enums"]["mouvement_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          motif?: string | null
          pdr_id: string
          prix_unitaire?: number | null
          quantite: number
          ref_document_erp?: string | null
          reference_source?: string | null
          source_id?: string | null
          source_type?: string | null
          stock_apres?: number
          stock_avant?: number
          type: Database["public"]["Enums"]["mouvement_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          motif?: string | null
          pdr_id?: string
          prix_unitaire?: number | null
          quantite?: number
          ref_document_erp?: string | null
          reference_source?: string | null
          source_id?: string | null
          source_type?: string | null
          stock_apres?: number
          stock_avant?: number
          type?: Database["public"]["Enums"]["mouvement_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdr_stock_movements_pdr_id_fkey"
            columns: ["pdr_id"]
            isOneToOne: false
            referencedRelation: "pdr"
            referencedColumns: ["id"]
          },
        ]
      }
      pdr_suppliers: {
        Row: {
          contact: string | null
          created_at: string
          delai_jours: number | null
          id: string
          is_principal: boolean
          nom: string
          notes: string | null
          pdr_id: string
          prix: number | null
          reference_fournisseur: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          delai_jours?: number | null
          id?: string
          is_principal?: boolean
          nom: string
          notes?: string | null
          pdr_id: string
          prix?: number | null
          reference_fournisseur?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          delai_jours?: number | null
          id?: string
          is_principal?: boolean
          nom?: string
          notes?: string | null
          pdr_id?: string
          prix?: number | null
          reference_fournisseur?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdr_suppliers_pdr_id_fkey"
            columns: ["pdr_id"]
            isOneToOne: false
            referencedRelation: "pdr"
            referencedColumns: ["id"]
          },
        ]
      }
      preventive_executions: {
        Row: {
          checklist_results: Json | null
          created_at: string
          date_execution: string
          executed_by: string
          id: string
          notes: string | null
          pdr_used: Json | null
          plan_id: string
        }
        Insert: {
          checklist_results?: Json | null
          created_at?: string
          date_execution?: string
          executed_by: string
          id?: string
          notes?: string | null
          pdr_used?: Json | null
          plan_id: string
        }
        Update: {
          checklist_results?: Json | null
          created_at?: string
          date_execution?: string
          executed_by?: string
          id?: string
          notes?: string | null
          pdr_used?: Json | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preventive_executions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "preventive_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      preventive_plans: {
        Row: {
          checklist: Json | null
          created_at: string
          derniere_execution: string | null
          description: string | null
          frequence: Database["public"]["Enums"]["frequence_preventif"]
          id: string
          is_active: boolean
          machine_id: string
          prochaine_echeance: string | null
          title: string
          updated_at: string
        }
        Insert: {
          checklist?: Json | null
          created_at?: string
          derniere_execution?: string | null
          description?: string | null
          frequence?: Database["public"]["Enums"]["frequence_preventif"]
          id?: string
          is_active?: boolean
          machine_id: string
          prochaine_echeance?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          checklist?: Json | null
          created_at?: string
          derniere_execution?: string | null
          description?: string | null
          frequence?: Database["public"]["Enums"]["frequence_preventif"]
          id?: string
          is_active?: boolean
          machine_id?: string
          prochaine_echeance?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preventive_plans_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      product_families: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_families_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
        ]
      }
      production_declarations: {
        Row: {
          created_at: string
          declared_by: string | null
          heure_production: string
          id: string
          notes: string | null
          of_id: string
          quantite_produite: number
          quantite_rebut: number
          shift_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          declared_by?: string | null
          heure_production: string
          id?: string
          notes?: string | null
          of_id: string
          quantite_produite?: number
          quantite_rebut?: number
          shift_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          declared_by?: string | null
          heure_production?: string
          id?: string
          notes?: string | null
          of_id?: string
          quantite_produite?: number
          quantite_rebut?: number
          shift_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_declarations_of_id_fkey"
            columns: ["of_id"]
            isOneToOne: false
            referencedRelation: "ordres_fabrication"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_declarations_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      production_lines: {
        Row: {
          atelier: string | null
          code: string
          created_at: string
          description: string | null
          designation: string
          id: string
          is_active: boolean
          machine_id: string | null
          updated_at: string
        }
        Insert: {
          atelier?: string | null
          code: string
          created_at?: string
          description?: string | null
          designation: string
          id?: string
          is_active?: boolean
          machine_id?: string | null
          updated_at?: string
        }
        Update: {
          atelier?: string | null
          code?: string
          created_at?: string
          description?: string | null
          designation?: string
          id?: string
          is_active?: boolean
          machine_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_lines_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      production_stops: {
        Row: {
          created_at: string
          declared_by: string | null
          description: string | null
          duree_minutes: number | null
          heure_debut: string
          heure_fin: string | null
          id: string
          line_id: string | null
          machine_id: string | null
          of_id: string
          shift_id: string
          ticket_id: string | null
          type: Database["public"]["Enums"]["arret_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          declared_by?: string | null
          description?: string | null
          duree_minutes?: number | null
          heure_debut?: string
          heure_fin?: string | null
          id?: string
          line_id?: string | null
          machine_id?: string | null
          of_id: string
          shift_id: string
          ticket_id?: string | null
          type?: Database["public"]["Enums"]["arret_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          declared_by?: string | null
          description?: string | null
          duree_minutes?: number | null
          heure_debut?: string
          heure_fin?: string | null
          id?: string
          line_id?: string | null
          machine_id?: string | null
          of_id?: string
          shift_id?: string
          ticket_id?: string | null
          type?: Database["public"]["Enums"]["arret_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_stops_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_stops_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_stops_of_id_fkey"
            columns: ["of_id"]
            isOneToOne: false
            referencedRelation: "ordres_fabrication"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_stops_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_stops_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          code: string
          code_erp: string | null
          created_at: string
          description: string | null
          designation: string
          family_id: string | null
          id: string
          is_active: boolean
          poids_unitaire: number | null
          unite: string
          unite_base: string | null
          updated_at: string
        }
        Insert: {
          code: string
          code_erp?: string | null
          created_at?: string
          description?: string | null
          designation: string
          family_id?: string | null
          id?: string
          is_active?: boolean
          poids_unitaire?: number | null
          unite?: string
          unite_base?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          code_erp?: string | null
          created_at?: string
          description?: string | null
          designation?: string
          family_id?: string | null
          id?: string
          is_active?: boolean
          poids_unitaire?: number | null
          unite?: string
          unite_base?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          poste: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          poste?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          poste?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_lines: {
        Row: {
          article_id: string
          created_at: string
          id: string
          quantite: number
          recipe_id: string
          unite: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          quantite?: number
          recipe_id: string
          unite?: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          quantite?: number
          recipe_id?: string
          unite?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_lines_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_lines_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          product_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          product_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          product_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      shift_mode_slots: {
        Row: {
          created_at: string
          heure_debut: string
          heure_fin: string
          id: string
          label: string
          shift_mode_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          heure_debut: string
          heure_fin: string
          id?: string
          label: string
          shift_mode_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          heure_debut?: string
          heure_fin?: string
          id?: string
          label?: string
          shift_mode_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "shift_mode_slots_shift_mode_id_fkey"
            columns: ["shift_mode_id"]
            isOneToOne: false
            referencedRelation: "shift_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_modes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          nb_shifts: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          nb_shifts?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          nb_shifts?: number
          updated_at?: string
        }
        Relationships: []
      }
      shift_rotation: {
        Row: {
          created_at: string
          date_shift: string
          id: string
          is_repos: boolean
          shift_team_id: string
          time_slot_id: string | null
        }
        Insert: {
          created_at?: string
          date_shift: string
          id?: string
          is_repos?: boolean
          shift_team_id: string
          time_slot_id?: string | null
        }
        Update: {
          created_at?: string
          date_shift?: string
          id?: string
          is_repos?: boolean
          shift_team_id?: string
          time_slot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_rotation_shift_team_id_fkey"
            columns: ["shift_team_id"]
            isOneToOne: false
            referencedRelation: "shift_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_rotation_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "shift_time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label?: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      shift_teams: {
        Row: {
          code: string
          color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shift_time_slots: {
        Row: {
          code: string
          created_at: string
          heure_debut: string
          heure_fin: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          heure_debut: string
          heure_fin: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          heure_debut?: string
          heure_fin?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          chef_ligne_id: string | null
          created_at: string
          date_shift: string
          heure_debut: string
          heure_debut_reelle: string | null
          heure_fin: string
          heure_fin_reelle: string | null
          id: string
          is_active: boolean
          line_id: string
          observations: string | null
          of_id: string
          shift_team_id: string | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          statut: string
          updated_at: string
        }
        Insert: {
          chef_ligne_id?: string | null
          created_at?: string
          date_shift: string
          heure_debut: string
          heure_debut_reelle?: string | null
          heure_fin: string
          heure_fin_reelle?: string | null
          id?: string
          is_active?: boolean
          line_id: string
          observations?: string | null
          of_id: string
          shift_team_id?: string | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          statut?: string
          updated_at?: string
        }
        Update: {
          chef_ligne_id?: string | null
          created_at?: string
          date_shift?: string
          heure_debut?: string
          heure_debut_reelle?: string | null
          heure_fin?: string
          heure_fin_reelle?: string | null
          id?: string
          is_active?: boolean
          line_id?: string
          observations?: string | null
          of_id?: string
          shift_team_id?: string | null
          shift_type?: Database["public"]["Enums"]["shift_type"]
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_of_id_fkey"
            columns: ["of_id"]
            isOneToOne: false
            referencedRelation: "ordres_fabrication"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_shift_team_id_fkey"
            columns: ["shift_team_id"]
            isOneToOne: false
            referencedRelation: "shift_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assignee_id: string | null
          cause_racine: string | null
          created_at: string
          declarant_id: string | null
          description: string
          heure_cloture: string | null
          heure_declaration: string
          heure_prise_en_charge: string | null
          heure_resolution: string | null
          id: string
          is_from_gpao: boolean | null
          ligne_id: string | null
          machine_id: string
          numero: string
          of_id: string | null
          panne_type_id: string | null
          priorite: Database["public"]["Enums"]["ticket_priorite"]
          shift_id: string | null
          solution: string | null
          statut: Database["public"]["Enums"]["ticket_statut"]
          temps_arret_minutes: number | null
          temps_intervention_minutes: number | null
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          cause_racine?: string | null
          created_at?: string
          declarant_id?: string | null
          description?: string
          heure_cloture?: string | null
          heure_declaration?: string
          heure_prise_en_charge?: string | null
          heure_resolution?: string | null
          id?: string
          is_from_gpao?: boolean | null
          ligne_id?: string | null
          machine_id: string
          numero: string
          of_id?: string | null
          panne_type_id?: string | null
          priorite?: Database["public"]["Enums"]["ticket_priorite"]
          shift_id?: string | null
          solution?: string | null
          statut?: Database["public"]["Enums"]["ticket_statut"]
          temps_arret_minutes?: number | null
          temps_intervention_minutes?: number | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          cause_racine?: string | null
          created_at?: string
          declarant_id?: string | null
          description?: string
          heure_cloture?: string | null
          heure_declaration?: string
          heure_prise_en_charge?: string | null
          heure_resolution?: string | null
          id?: string
          is_from_gpao?: boolean | null
          ligne_id?: string | null
          machine_id?: string
          numero?: string
          of_id?: string | null
          panne_type_id?: string | null
          priorite?: Database["public"]["Enums"]["ticket_priorite"]
          shift_id?: string | null
          solution?: string | null
          statut?: Database["public"]["Enums"]["ticket_statut"]
          temps_arret_minutes?: number | null
          temps_intervention_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_ligne_id_fkey"
            columns: ["ligne_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_of_id_fkey"
            columns: ["of_id"]
            isOneToOne: false
            referencedRelation: "ordres_fabrication"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_panne_type_id_fkey"
            columns: ["panne_type_id"]
            isOneToOne: false
            referencedRelation: "panne_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_document_permission: {
        Args: { _action: string; _entity_type: string; _user_id: string }
        Returns: boolean
      }
      check_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "resp_maintenance"
        | "maintenancier"
        | "resp_production"
        | "chef_ligne"
        | "operateur"
        | "gestionnaire_magasin"
        | "bureau_methode"
      approvisionnement_type: "local" | "importation" | "mixte"
      arret_type:
        | "panne"
        | "changement_serie"
        | "pause"
        | "nettoyage"
        | "attente_matiere"
        | "qualite"
        | "autre"
      criticite: "A" | "B" | "C"
      criticite_maintenance: "faible" | "moyenne" | "elevee" | "critique"
      disponibilite_pdr: "disponible" | "partiel" | "indisponible"
      equipement_statut:
        | "en_service"
        | "hors_service"
        | "en_maintenance"
        | "reforme"
      equipement_type:
        | "capteur"
        | "actionneur"
        | "convoyeur"
        | "peripherique"
        | "utilite"
        | "sous_ensemble"
        | "instrument"
        | "autre"
      frequence_preventif:
        | "quotidien"
        | "hebdomadaire"
        | "mensuel"
        | "trimestriel"
        | "semestriel"
        | "annuel"
      impact_ligne: "arret_complet" | "arret_partiel" | "degradation" | "aucun"
      intervention_statut: "en_cours" | "terminee" | "annulee"
      machine_statut: "en_marche" | "arret" | "maintenance"
      mouvement_type: "entree" | "sortie" | "correction" | "inventaire"
      of_statut: "planifie" | "en_cours" | "termine" | "annule"
      role_fonctionnel:
        | "alimentation"
        | "transformation"
        | "dosage"
        | "melange"
        | "convoyage"
        | "conditionnement"
        | "controle"
        | "evacuation"
        | "utilite"
        | "autre"
      shift_type: "matin" | "apres_midi" | "nuit"
      statut_pdr: "strategique" | "commune"
      ticket_priorite: "critique" | "haute" | "normale" | "basse"
      ticket_statut:
        | "ouvert"
        | "pris_en_charge"
        | "en_cours"
        | "resolu"
        | "cloture"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "resp_maintenance",
        "maintenancier",
        "resp_production",
        "chef_ligne",
        "operateur",
        "gestionnaire_magasin",
        "bureau_methode",
      ],
      approvisionnement_type: ["local", "importation", "mixte"],
      arret_type: [
        "panne",
        "changement_serie",
        "pause",
        "nettoyage",
        "attente_matiere",
        "qualite",
        "autre",
      ],
      criticite: ["A", "B", "C"],
      criticite_maintenance: ["faible", "moyenne", "elevee", "critique"],
      disponibilite_pdr: ["disponible", "partiel", "indisponible"],
      equipement_statut: [
        "en_service",
        "hors_service",
        "en_maintenance",
        "reforme",
      ],
      equipement_type: [
        "capteur",
        "actionneur",
        "convoyeur",
        "peripherique",
        "utilite",
        "sous_ensemble",
        "instrument",
        "autre",
      ],
      frequence_preventif: [
        "quotidien",
        "hebdomadaire",
        "mensuel",
        "trimestriel",
        "semestriel",
        "annuel",
      ],
      impact_ligne: ["arret_complet", "arret_partiel", "degradation", "aucun"],
      intervention_statut: ["en_cours", "terminee", "annulee"],
      machine_statut: ["en_marche", "arret", "maintenance"],
      mouvement_type: ["entree", "sortie", "correction", "inventaire"],
      of_statut: ["planifie", "en_cours", "termine", "annule"],
      role_fonctionnel: [
        "alimentation",
        "transformation",
        "dosage",
        "melange",
        "convoyage",
        "conditionnement",
        "controle",
        "evacuation",
        "utilite",
        "autre",
      ],
      shift_type: ["matin", "apres_midi", "nuit"],
      statut_pdr: ["strategique", "commune"],
      ticket_priorite: ["critique", "haute", "normale", "basse"],
      ticket_statut: [
        "ouvert",
        "pris_en_charge",
        "en_cours",
        "resolu",
        "cloture",
      ],
    },
  },
} as const
