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
          date_mise_en_service: string | null
          description: string | null
          designation: string
          family_id: string | null
          id: string
          is_active: boolean
          localisation: string | null
          marque: string | null
          modele: string | null
          numero_serie: string | null
          statut: Database["public"]["Enums"]["machine_statut"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          criticite?: Database["public"]["Enums"]["criticite"]
          date_mise_en_service?: string | null
          description?: string | null
          designation: string
          family_id?: string | null
          id?: string
          is_active?: boolean
          localisation?: string | null
          marque?: string | null
          modele?: string | null
          numero_serie?: string | null
          statut?: Database["public"]["Enums"]["machine_statut"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          criticite?: Database["public"]["Enums"]["criticite"]
          date_mise_en_service?: string | null
          description?: string | null
          designation?: string
          family_id?: string | null
          id?: string
          is_active?: boolean
          localisation?: string | null
          marque?: string | null
          modele?: string | null
          numero_serie?: string | null
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
          created_at: string
          description: string | null
          designation: string
          emplacement: string | null
          fournisseur: string | null
          id: string
          is_active: boolean
          prix_unitaire: number | null
          reference: string
          stock_actuel: number
          stock_min: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          designation: string
          emplacement?: string | null
          fournisseur?: string | null
          id?: string
          is_active?: boolean
          prix_unitaire?: number | null
          reference: string
          stock_actuel?: number
          stock_min?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          designation?: string
          emplacement?: string | null
          fournisseur?: string | null
          id?: string
          is_active?: boolean
          prix_unitaire?: number | null
          reference?: string
          stock_actuel?: number
          stock_min?: number
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "tickets_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_panne_type_id_fkey"
            columns: ["panne_type_id"]
            isOneToOne: false
            referencedRelation: "panne_types"
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
      criticite: "A" | "B" | "C"
      frequence_preventif:
        | "quotidien"
        | "hebdomadaire"
        | "mensuel"
        | "trimestriel"
        | "semestriel"
        | "annuel"
      intervention_statut: "en_cours" | "terminee" | "annulee"
      machine_statut: "en_marche" | "arret" | "maintenance"
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
      ],
      criticite: ["A", "B", "C"],
      frequence_preventif: [
        "quotidien",
        "hebdomadaire",
        "mensuel",
        "trimestriel",
        "semestriel",
        "annuel",
      ],
      intervention_statut: ["en_cours", "terminee", "annulee"],
      machine_statut: ["en_marche", "arret", "maintenance"],
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
