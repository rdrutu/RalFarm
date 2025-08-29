export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          legal_name: string
          cui: string | null
          address: string | null
          phone: string | null
          email: string | null
          status: 'active' | 'inactive' | 'deleted'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          legal_name: string
          cui?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          status?: 'active' | 'inactive' | 'deleted'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          legal_name?: string
          cui?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          status?: 'active' | 'inactive' | 'deleted'
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          company_id: string | null
          username: string
          email: string
          password_hash: string
          full_name: string
          role: 'super_admin' | 'admin_company' | 'admin_farm' | 'engineer'
          status: 'active' | 'inactive' | 'deleted'
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          username: string
          email: string
          password_hash: string
          full_name: string
          role: 'super_admin' | 'admin_company' | 'admin_farm' | 'engineer'
          status?: 'active' | 'inactive' | 'deleted'
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          username?: string
          email?: string
          password_hash?: string
          full_name?: string
          role?: 'super_admin' | 'admin_company' | 'admin_farm' | 'engineer'
          status?: 'active' | 'inactive' | 'deleted'
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      farms: {
        Row: {
          id: string
          company_id: string
          name: string
          description: string | null
          address: string | null
          total_area: number | null
          latitude: number | null
          longitude: number | null
          status: 'active' | 'inactive' | 'deleted'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          description?: string | null
          address?: string | null
          total_area?: number | null
          latitude?: number | null
          longitude?: number | null
          status?: 'active' | 'inactive' | 'deleted'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          description?: string | null
          address?: string | null
          total_area?: number | null
          latitude?: number | null
          longitude?: number | null
          status?: 'active' | 'inactive' | 'deleted'
          created_at?: string
          updated_at?: string
        }
      }
      plots: {
        Row: {
          id: string
          farm_id: string
          name: string
          description: string | null
          coordinates: Json | null
          calculated_area: number | null
          soil_type: string | null
          slope_percentage: number | null
          status: 'free' | 'planted' | 'harvesting' | 'processing'
          rent_type: 'fixed_amount' | 'percentage_yield' | null
          rent_amount: number | null
          rent_percentage: number | null
          rent_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          farm_id: string
          name: string
          description?: string | null
          coordinates?: Json | null
          calculated_area?: number | null
          soil_type?: string | null
          slope_percentage?: number | null
          status?: 'free' | 'planted' | 'harvesting' | 'processing'
          rent_type?: 'fixed_amount' | 'percentage_yield' | null
          rent_amount?: number | null
          rent_percentage?: number | null
          rent_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          farm_id?: string
          name?: string
          description?: string | null
          coordinates?: Json | null
          calculated_area?: number | null
          soil_type?: string | null
          slope_percentage?: number | null
          status?: 'free' | 'planted' | 'harvesting' | 'processing'
          rent_type?: 'fixed_amount' | 'percentage_yield' | null
          rent_amount?: number | null
          rent_percentage?: number | null
          rent_description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cultivation_campaigns: {
        Row: {
          id: string
          farm_id: string
          plot_id: string
          crop_type_id: string
          name: string
          crop_year: number
          planted_area: number | null
          planting_date: string | null
          expected_harvest_date: string | null
          actual_harvest_date: string | null
          status: 'planned' | 'planted' | 'growing' | 'ready_harvest' | 'harvested' | 'completed' | 'failed'
          total_harvest_kg: number | null
          yield_per_ha: number | null
          season_feedback: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          farm_id: string
          plot_id: string
          crop_type_id: string
          name: string
          crop_year: number
          planted_area?: number | null
          planting_date?: string | null
          expected_harvest_date?: string | null
          actual_harvest_date?: string | null
          status?: 'planned' | 'planted' | 'growing' | 'ready_harvest' | 'harvested' | 'completed' | 'failed'
          total_harvest_kg?: number | null
          yield_per_ha?: number | null
          season_feedback?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          farm_id?: string
          plot_id?: string
          crop_type_id?: string
          name?: string
          crop_year?: number
          planted_area?: number | null
          planting_date?: string | null
          expected_harvest_date?: string | null
          actual_harvest_date?: string | null
          status?: 'planned' | 'planted' | 'growing' | 'ready_harvest' | 'harvested' | 'completed' | 'failed'
          total_harvest_kg?: number | null
          yield_per_ha?: number | null
          season_feedback?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      crop_types: {
        Row: {
          id: string
          name: string
          scientific_name: string | null
          category: string | null
          average_yield_per_ha: number | null
          average_price_per_kg: number | null
          planting_season: string | null
          harvest_season: string | null
          description: string | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          scientific_name?: string | null
          category?: string | null
          average_yield_per_ha?: number | null
          average_price_per_kg?: number | null
          planting_season?: string | null
          harvest_season?: string | null
          description?: string | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          scientific_name?: string | null
          category?: string | null
          average_yield_per_ha?: number | null
          average_price_per_kg?: number | null
          planting_season?: string | null
          harvest_season?: string | null
          description?: string | null
          is_active?: boolean | null
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          farm_id: string
          campaign_id: string | null
          cost_type: 'specific' | 'general'
          category: 'seeds' | 'fertilizers' | 'pesticides' | 'plot_labor' | 'plot_rent' | 'irrigation' | 'fuel' | 'machinery' | 'general_labor' | 'insurance' | 'taxes' | 'maintenance' | 'utilities' | 'other'
          amount_ron: number
          vat_amount_ron: number | null
          total_amount_ron: number
          description: string
          supplier: string | null
          invoice_number: string | null
          invoice_date: string | null
          quantity: number | null
          unit: string | null
          unit_price: number | null
          expense_date: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          farm_id: string
          campaign_id?: string | null
          cost_type: 'specific' | 'general'
          category: 'seeds' | 'fertilizers' | 'pesticides' | 'plot_labor' | 'plot_rent' | 'irrigation' | 'fuel' | 'machinery' | 'general_labor' | 'insurance' | 'taxes' | 'maintenance' | 'utilities' | 'other'
          amount_ron: number
          vat_amount_ron?: number | null
          total_amount_ron: number
          description: string
          supplier?: string | null
          invoice_number?: string | null
          invoice_date?: string | null
          quantity?: number | null
          unit?: string | null
          unit_price?: number | null
          expense_date: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          farm_id?: string
          campaign_id?: string | null
          cost_type?: 'specific' | 'general'
          category?: 'seeds' | 'fertilizers' | 'pesticides' | 'plot_labor' | 'plot_rent' | 'irrigation' | 'fuel' | 'machinery' | 'general_labor' | 'insurance' | 'taxes' | 'maintenance' | 'utilities' | 'other'
          amount_ron?: number
          vat_amount_ron?: number | null
          total_amount_ron?: number
          description?: string
          supplier?: string | null
          invoice_number?: string | null
          invoice_date?: string | null
          quantity?: number | null
          unit?: string | null
          unit_price?: number | null
          expense_date?: string
          created_at?: string
          created_by?: string | null
        }
      }
    }
    Views: {
      campaign_profit_view: {
        Row: {
          campaign_id: string | null
          campaign_name: string | null
          farm_id: string | null
          farm_name: string | null
          company_name: string | null
          plot_name: string | null
          crop_name: string | null
          planted_area: number | null
          total_harvest_kg: number | null
          yield_per_ha: number | null
          revenue_ron: number | null
          specific_costs_ron: number | null
          gross_profit_ron: number | null
        }
      }
      farm_profit_view: {
        Row: {
          farm_id: string | null
          farm_name: string | null
          company_name: string | null
          total_gross_profit_ron: number | null
          total_general_costs_ron: number | null
          net_profit_ron: number | null
        }
      }
    }
    Functions: {}
    Enums: {
      user_role: 'super_admin' | 'admin_company' | 'admin_farm' | 'engineer'
      status_type: 'active' | 'inactive' | 'deleted'
      plot_status: 'free' | 'planted' | 'harvesting' | 'processing'
      rent_type: 'fixed_amount' | 'percentage_yield'
      campaign_status: 'planned' | 'planted' | 'growing' | 'ready_harvest' | 'harvested' | 'completed' | 'failed'
      stock_movement_type: 'production' | 'sale' | 'storage' | 'usage' | 'loss' | 'adjustment'
      cost_category: 'seeds' | 'fertilizers' | 'pesticides' | 'plot_labor' | 'plot_rent' | 'irrigation' | 'fuel' | 'machinery' | 'general_labor' | 'insurance' | 'taxes' | 'maintenance' | 'utilities' | 'other'
      cost_type: 'specific' | 'general'
      contract_type: 'permanent' | 'seasonal' | 'daily' | 'hourly'
      operation_type: 'plowing' | 'seeding' | 'fertilizing' | 'spraying' | 'irrigation' | 'harvesting' | 'soil_preparation' | 'maintenance' | 'other'
      invoice_status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
    }
  }
}
