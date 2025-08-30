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
      agricultural_products: {
        Row: {
          id: string
          name: string
          category: Database['public']['Enums']['product_category']
          manufacturer: string | null
          active_substance: string | null
          concentration: string | null
          unit: Database['public']['Enums']['measurement_unit']
          price_per_unit: number
          min_dose_per_ha: number | null
          max_dose_per_ha: number | null
          recommended_dose_per_ha: number | null
          safety_period_days: number | null
          preharvest_interval_days: number | null
          registration_number: string | null
          expiry_date: string | null
          storage_conditions: string | null
          application_method: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: Database['public']['Enums']['product_category']
          manufacturer?: string | null
          active_substance?: string | null
          concentration?: string | null
          unit: Database['public']['Enums']['measurement_unit']
          price_per_unit: number
          min_dose_per_ha?: number | null
          max_dose_per_ha?: number | null
          recommended_dose_per_ha?: number | null
          safety_period_days?: number | null
          preharvest_interval_days?: number | null
          registration_number?: string | null
          expiry_date?: string | null
          storage_conditions?: string | null
          application_method?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: Database['public']['Enums']['product_category']
          manufacturer?: string | null
          active_substance?: string | null
          concentration?: string | null
          unit?: Database['public']['Enums']['measurement_unit']
          price_per_unit?: number
          min_dose_per_ha?: number | null
          max_dose_per_ha?: number | null
          recommended_dose_per_ha?: number | null
          safety_period_days?: number | null
          preharvest_interval_days?: number | null
          registration_number?: string | null
          expiry_date?: string | null
          storage_conditions?: string | null
          application_method?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      campaign_activities: {
        Row: {
          id: string
          campaign_id: string
          name: string
          activity_type: Database['public']['Enums']['activity_type']
          description: string | null
          planned_date: string | null
          planned_area_ha: number | null
          planned_cost_ron: number | null
          actual_date: string | null
          actual_area_ha: number | null
          actual_cost_ron: number | null
          status: Database['public']['Enums']['activity_status']
          completion_percentage: number
          weather_conditions: string | null
          soil_conditions: string | null
          equipment_used: string | null
          operator_name: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          activity_type: Database['public']['Enums']['activity_type']
          description?: string | null
          planned_date?: string | null
          planned_area_ha?: number | null
          planned_cost_ron?: number | null
          actual_date?: string | null
          actual_area_ha?: number | null
          actual_cost_ron?: number | null
          status?: Database['public']['Enums']['activity_status']
          completion_percentage?: number
          weather_conditions?: string | null
          soil_conditions?: string | null
          equipment_used?: string | null
          operator_name?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          activity_type?: Database['public']['Enums']['activity_type']
          description?: string | null
          planned_date?: string | null
          planned_area_ha?: number | null
          planned_cost_ron?: number | null
          actual_date?: string | null
          actual_area_ha?: number | null
          actual_cost_ron?: number | null
          status?: Database['public']['Enums']['activity_status']
          completion_percentage?: number
          weather_conditions?: string | null
          soil_conditions?: string | null
          equipment_used?: string | null
          operator_name?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      activity_products: {
        Row: {
          id: string
          activity_id: string
          product_id: string
          planned_quantity_per_ha: number | null
          planned_total_quantity: number | null
          planned_unit_cost: number | null
          planned_total_cost: number | null
          actual_quantity_per_ha: number | null
          actual_total_quantity: number | null
          actual_unit_cost: number | null
          actual_total_cost: number | null
          application_method: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          product_id: string
          planned_quantity_per_ha?: number | null
          planned_total_quantity?: number | null
          planned_unit_cost?: number | null
          planned_total_cost?: number | null
          actual_quantity_per_ha?: number | null
          actual_total_quantity?: number | null
          actual_unit_cost?: number | null
          actual_total_cost?: number | null
          application_method?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          product_id?: string
          planned_quantity_per_ha?: number | null
          planned_total_quantity?: number | null
          planned_unit_cost?: number | null
          planned_total_cost?: number | null
          actual_quantity_per_ha?: number | null
          actual_total_quantity?: number | null
          actual_unit_cost?: number | null
          actual_total_cost?: number | null
          application_method?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      multi_plot_campaigns: {
        Row: {
          id: string
          name: string
          crop_type: string
          season: 'spring' | 'summer' | 'autumn' | 'winter'
          year: number
          total_area_ha: number
          start_date: string | null
          end_date: string | null
          status: 'planned' | 'active' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          crop_type: string
          season: 'spring' | 'summer' | 'autumn' | 'winter'
          year: number
          total_area_ha?: number
          start_date?: string | null
          end_date?: string | null
          status?: 'planned' | 'active' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          crop_type?: string
          season?: 'spring' | 'summer' | 'autumn' | 'winter'
          year?: number
          total_area_ha?: number
          start_date?: string | null
          end_date?: string | null
          status?: 'planned' | 'active' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      campaign_plots: {
        Row: {
          id: string
          campaign_id: string
          plot_id: string
          planted_area_ha: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          plot_id: string
          planted_area_ha: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          plot_id?: string
          planted_area_ha?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activity_plot_details: {
        Row: {
          id: string
          activity_id: string
          plot_id: string
          planned_quantity: number | null
          actual_quantity: number | null
          planned_date: string | null
          actual_date: string | null
          status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          plot_id: string
          planned_quantity?: number | null
          actual_quantity?: number | null
          planned_date?: string | null
          actual_date?: string | null
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          plot_id?: string
          planned_quantity?: number | null
          actual_quantity?: number | null
          planned_date?: string | null
          actual_date?: string | null
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      campaign_activities_detailed: {
        Row: {
          activity_id: string | null
          campaign_id: string | null
          activity_name: string | null
          activity_type: Database['public']['Enums']['activity_type'] | null
          status: Database['public']['Enums']['activity_status'] | null
          planned_date: string | null
          actual_date: string | null
          planned_area_ha: number | null
          actual_area_ha: number | null
          planned_cost_ron: number | null
          actual_cost_ron: number | null
          completion_percentage: number | null
          weather_conditions: string | null
          soil_conditions: string | null
          equipment_used: string | null
          operator_name: string | null
          campaign_name: string | null
          crop_year: number | null
          campaign_status: Database['public']['Enums']['campaign_status'] | null
          farm_name: string | null
          plot_name: string | null
          crop_name: string | null
          products_count: number | null
          total_planned_products_cost: number | null
          total_actual_products_cost: number | null
        }
      }
      farm_products_usage: {
        Row: {
          farm_id: string | null
          farm_name: string | null
          product_id: string | null
          product_name: string | null
          product_category: Database['public']['Enums']['product_category'] | null
          manufacturer: string | null
          unit: Database['public']['Enums']['measurement_unit'] | null
          price_per_unit: number | null
          total_planned_quantity: number | null
          total_actual_quantity: number | null
          total_planned_cost: number | null
          total_actual_cost: number | null
          usage_efficiency_percentage: number | null
          campaigns_used_in: number | null
          total_applications: number | null
          first_usage_date: string | null
          last_usage_date: string | null
        }
      }
      activity_cost_analysis: {
        Row: {
          farm_id: string | null
          farm_name: string | null
          activity_type: Database['public']['Enums']['activity_type'] | null
          total_activities: number | null
          completed_activities: number | null
          avg_planned_cost: number | null
          total_planned_cost: number | null
          avg_actual_cost: number | null
          total_actual_cost: number | null
          cost_variance: number | null
          cost_variance_percentage: number | null
          total_planned_area: number | null
          total_actual_area: number | null
          earliest_planned_date: string | null
          latest_completion_date: string | null
        }
      }
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
      product_category: 'fertilizer' | 'herbicide' | 'fungicide' | 'insecticide' | 'growth_regulator' | 'seed' | 'other'
      measurement_unit: 'kg' | 'l' | 'ton' | 'ml' | 'g' | 'pieces' | 'ha'
      activity_type: 'soil_preparation' | 'planting' | 'fertilization' | 'herbicide_treatment' | 'fungicide_treatment' | 'insecticide_treatment' | 'irrigation' | 'cultivation' | 'harvesting' | 'other'
      activity_status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
    }
  }
}
