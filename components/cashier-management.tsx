"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Edit,
  Receipt,
  Printer,
  RefreshCw,
  Trash2,
  Package,
  X,
  Check,
  MapPin,
  Store,
  Menu,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Settings,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase, getOutletStock, updateOutletStock, getLowStockAlerts, type OutletStock } from "@/lib/supabase"
import { Switch } from "@/components/ui/switch"

interface MenuCategory {
  id: string
  name: string
  description?: string
  icon: string
  status: "active" | "inactive"
  sort_order: number
  created_at: string
  itemCount?: number
}

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  category_id: string
  type: "service" | "product"
  duration?: number
  stock?: number
  status: "active" | "inactive"
  created_at: string
  category?: {
    name: string
    icon: string
  }
  totalOrders?: number
  totalRevenue?: number
}

interface Branch {
  id: string
  name: string
}

interface ReceiptTemplate {
  id: string
  name: string
  header_text?: string
  footer_text?: string
  logo_url?: string
  branch_id?: string
  is_active?: boolean
  is_default?: boolean
  template_data?: any
  paper_size?: string
  font_size?: string
  show_logo?: boolean
  show_address?: boolean
  show_phone?: boolean
  show_date?: boolean
  show_cashier?: boolean
  show_barber?: boolean
  created_at?: string
  updated_at?: string
}

interface OutletMenuSettings {
  id: string
  outlet_id: string
  menu_id: string
  custom_price?: number
  stock_quantity?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export function CashierManagement() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [menuItemsLoading, setMenuItemsLoading] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [receiptTemplates, setReceiptTemplates] = useState<ReceiptTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ReceiptTemplate | null>(null)
  const [isEditTemplateDialogOpen, setIsEditTemplateDialogOpen] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [isAddMenuItemDialogOpen, setIsAddMenuItemDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const { toast } = useToast()
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templateHeader, setTemplateHeader] = useState("")
  const [templateFooter, setTemplateFooter] = useState("")
  const [selectedBranch, setSelectedBranch] = useState("")
  const [saving, setSaving] = useState(false)
  const [paperSize, setPaperSize] = useState("80mm")
  const [fontSize, setFontSize] = useState("medium")
  const [showLogo, setShowLogo] = useState(true)
  const [showAddress, setShowAddress] = useState(true)
  const [showPhone, setShowPhone] = useState(true)
  const [showDate, setShowDate] = useState(true)
  const [showCashier, setShowCashier] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [showBarber, setShowBarber] = useState(true)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // NEW STATE FOR OUTLET STOCK MANAGEMENT
  const [selectedOutlet, setSelectedOutlet] = useState("")
  const [outletStock, setOutletStock] = useState<OutletStock[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [lowStockAlerts, setLowStockAlerts] = useState<OutletStock[]>([])

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    icon: "",
    sort_order: 0,
  })
  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: 0,
    category_id: "",
    duration: 0,
    stock: 0,
    type: "service" as "service" | "product",
  })
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)

  // NEW FUNCTIONS FOR OUTLET STOCK MANAGEMENT
  const fetchOutletStock = async (outletId: string) => {
    if (!outletId) return;
    
    setStockLoading(true);
    try {
      const { data, error } = await getOutletStock(outletId);
      if (error) {
        console.error("Error fetching outlet stock:", error);
        toast({
          title: "Error",
          description: "Gagal memuat stok outlet",
          variant: "destructive",
        });
        return;
      }
      setOutletStock(data || []);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setStockLoading(false);
    }
  };

  const fetchLowStockAlerts = async () => {
    try {
      const { data, error } = await getLowStockAlerts();
      if (error) {
        console.error("Error fetching low stock alerts:", error);
        return;
      }
      setLowStockAlerts(data || []);
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  const handleUpdateStock = async (serviceId: string, newStock: number) => {
    if (!selectedOutlet) {
      toast({
        title: "Error",
        description: "Pilih outlet terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await updateOutletStock(selectedOutlet, serviceId, newStock);
      if (error) {
        throw error;
      }
      
      // Update local state
      setOutletStock(prev => prev.map(item => 
        item.service_id === serviceId 
          ? { ...item, stock_quantity: newStock }
          : item
      ));

      // Refresh low stock alerts
      fetchLowStockAlerts();
      
      toast({
        title: "Berhasil",
        description: "Stok berhasil diupdate",
      });
    } catch (error) {
      console.error("Error updating stock:", error);
      toast({
        title: "Error",
        description: "Gagal mengupdate stok",
        variant: "destructive",
      });
    }
  };

  const resetTemplateForm = () => {
    setTemplateName("")
    setTemplateHeader("")
    setTemplateFooter("")
    setSelectedBranch("none")
    setPaperSize("80mm")
    setFontSize("medium")
    setShowLogo(true)
    setShowAddress(true)
    setShowPhone(true)
    setShowDate(true)
    setShowBarber(true)
    setLogoFile(null)
    setLogoPreview("")
    setEditingTemplateId(null)
  }

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const filePath = `receipt-logos/${fileName}`

      const { data, error } = await supabase.storage.from("attendance-photos").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        console.error("[v0] Error uploading logo:", error)
        return null
      }

      const { data: publicUrlData } = supabase.storage.from("attendance-photos").getPublicUrl(filePath)
      return publicUrlData?.publicUrl || null
    } catch (error) {
      console.error("[v0] Error uploading logo:", error)
      return null
    }
  }

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true)
      console.log("[v0] Fetching categories from Supabase...")

      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("sort_order", { ascending: true })

      if (error) {
        console.error("[v0] Error fetching categories:", error)
        return
      }

      console.log("[v0] Fetched categories:", data)
      setCategories(data || [])
    } catch (error) {
      console.error("[v0] Error:", error)
    } finally {
      setCategoriesLoading(false)
    }
  }

  const fetchMenuItems = async () => {
    try {
      setMenuItemsLoading(true)
      console.log("[v0] Fetching menu items from Supabase...")

      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          category:service_categories(name, icon)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching menu items:", error)
        return
      }

      console.log("[v0] Fetched menu items:", data)
      setMenuItems(data || [])
    } catch (error) {
      console.error("[v0] Error:", error)
    } finally {
      setMenuItemsLoading(false)
    }
  }

  const fetchReceiptTemplates = async () => {
    try {
      setReceiptLoading(true)
      console.log("[v0] Fetching receipt templates from Supabase...")

      const { data, error } = await supabase
        .from("receipt_templates")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching receipt templates:", error)
        return
      }

      console.log("[v0] Fetched receipt templates:", data)
      const templatesWithDefaults = (data || []).map((template) => ({
        ...template,
        header_text: template.header_text || "",
        footer_text: template.footer_text || "",
        logo_url: template.logo_url || null,
      }))
      setReceiptTemplates(templatesWithDefaults)
    } catch (error) {
      console.error("[v0] Error:", error)
    } finally {
      setReceiptLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase.from("branches").select("id, name").order("name")
      if (error) {
        console.error("[v0] Error fetching branches:", error)
        return
      }
      setBranches(data || [])
      if (data.length > 0 && !selectedOutlet) {
        setSelectedOutlet(data[0].id)
      }
    } catch (error) {
      console.error("[v0] Error fetching branches:", error)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchBranches(), 
        fetchReceiptTemplates(), 
        fetchCategories(), 
        fetchMenuItems(),
        fetchLowStockAlerts()
      ])
      if (selectedOutlet) {
        await fetchOutletStock(selectedOutlet)
      }
    } catch (error) {
      console.error("[v0] Error refreshing data:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBranches()
    fetchReceiptTemplates()
    fetchCategories()
    fetchMenuItems()
    fetchLowStockAlerts()
  }, [])

  useEffect(() => {
    if (selectedOutlet) {
      fetchOutletStock(selectedOutlet)
    }
  }, [selectedOutlet])

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "all" || item.category_id === filterCategory
    const matchesType = filterType === "all" || item.type === filterType
    const matchesStatus = filterStatus === "all" || item.status === filterStatus
    return matchesSearch && matchesCategory && matchesType && matchesStatus
  })

  const totalCategories = categories.length
  const activeCategories = categories.filter((c) => c.status === "active").length
  const totalMenuItems = menuItems.length
  const activeMenuItems = menuItems.filter((item) => item.status === "active").length
  console.log(
    "[v0] Active menu items:",
    menuItems.filter((item) => item.status === "active"),
  )
  const totalRevenue = menuItems
    .filter((item) => item.status === "active")
    .reduce((sum, item) => {
      const price = typeof item.price === "string" ? Number.parseFloat(item.price) : item.price || 0
      console.log("[v0] Adding price:", price, "for item:", item.name)
      return sum + price
    }, 0)
  console.log("[v0] Total revenue calculated:", totalRevenue)

  const createCategory = async () => {
    try {
      setSaving(true)
      const { data, error } = await supabase
        .from("service_categories")
        .insert([
          {
            name: categoryForm.name,
            description: categoryForm.description,
            icon: categoryForm.icon,
            sort_order: categoryForm.sort_order,
            status: "active",
          },
        ])
        .select()

      if (error) {
        console.error("[v0] Error creating category:", error)
        toast({
          title: "Error",
          description: "Gagal membuat kategori",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Berhasil",
        description: "Kategori berhasil dibuat",
      })

      setIsAddCategoryDialogOpen(false)
      setCategoryForm({ name: "", description: "", icon: "", sort_order: 0 })
      fetchCategories()
    } catch (error) {
      console.error("[v0] Error:", error)
    } finally {
      setSaving(false)
    }
  }

  const updateCategory = async () => {
    if (!editingCategory) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from("service_categories")
        .update({
          name: categoryForm.name,
          description: categoryForm.description,
          icon: categoryForm.icon,
          sort_order: categoryForm.sort_order,
        })
        .eq("id", editingCategory.id)

      if (error) {
        console.error("[v0] Error updating category:", error)
        toast({
          title: "Error",
          description: "Gagal mengupdate kategori",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Berhasil",
        description: "Kategori berhasil diupdate",
      })

      setIsAddCategoryDialogOpen(false)
      setEditingCategory(null)
      setCategoryForm({ name: "", description: "", icon: "", sort_order: 0 })
      fetchCategories()
    } catch (error) {
      console.error("[v0] Error:", error)
    } finally {
      setSaving(false)
    }
  }

  const deleteCategory = async (categoryId: string) => {
    if (!confirm("Yakin ingin menghapus kategori ini?")) return

    try {
      const { error } = await supabase.from("service_categories").delete().eq("id", categoryId)

      if (error) {
        console.error("[v0] Error deleting category:", error)
        toast({
          title: "Error",
          description: "Gagal menghapus kategori",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Berhasil",
        description: "Kategori berhasil dihapus",
      })

      fetchCategories()
      fetchMenuItems() // Refresh menu items as well
    } catch (error) {
      console.error("[v0] Error:", error)
    } finally {
      setSaving(false)
    }
  }

  const createMenuItem = async () => {
    try {
      setSaving(true)
      const { data, error } = await supabase
        .from("services")
        .insert([
          {
            name: menuForm.name,
            description: menuForm.description,
            price: menuForm.price,
            category_id: menuForm.category_id || null,
            duration: menuForm.type === "service" ? menuForm.duration : 0,
            status: "active",
          },
        ])
        .select()

      if (error) {
        console.error("[v0] Error creating menu item:", error)
        toast({
          title: "Error",
          description: "Gagal membuat menu",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Berhasil",
        description: "Menu berhasil dibuat",
      })

      setIsAddMenuItemDialogOpen(false)
      setMenuForm({ name: "", description: "", price: 0, category_id: "", duration: 0, type: "service", stock: 0 })
      fetchMenuItems()
    } catch (error) {
      console.error("[v0] Error:", error)
    } finally {
      setSaving(false)
    }
  }

  const updateMenuItem = async () => {
    if (!editingMenuItem) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from("services")
        .update({
          name: menuForm.name,
          description: menuForm.description,
          price: menuForm.price,
          category_id: menuForm.category_id,
          type: menuForm.type,
          duration: menuForm.type === "service" ? menuForm.duration : 0,
          stock: menuForm.type === "product" ? menuForm.stock : null,
        })
        .eq("id", editingMenuItem.id)

      if (error) {
        console.error("[v0] Error updating menu item:", error)
        toast({
          title: "Error",
          description: "Gagal mengupdate menu",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Berhasil",
        description: "Menu berhasil diupdate",
      })

      setIsAddMenuItemDialogOpen(false)
      setEditingMenuItem(null)
      setMenuForm({ name: "", description: "", price: 0, category_id: "", duration: 0, type: "service", stock: 0 })
      fetchMenuItems()
    } catch (error) {
      console.error("[v0] Error:", error)
    } finally {
      setSaving(false)
    }
  }

  const deleteMenuItem = async (itemId: string) => {
    if (!confirm("Yakin ingin menghapus menu ini?")) return

    try {
      const { error } = await supabase.from("services").delete().eq("id", itemId)

      if (error) {
        console.error("[v0] Error deleting menu item:", error)
        toast({
          title: "Error",
          description: "Gagal menghapus menu",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Berhasil",
        description: "Menu berhasil dihapus",
      })

      fetchMenuItems()
    } catch (error) {
      console.error("[v0] Error:", error)
    }
  }

  const handleSaveTemplate = async () => {
    try {
      setSavingTemplate(true)
      let logoUploadUrl = logoUrl

      if (logoFile) {
        logoUploadUrl = await uploadLogo(logoFile)
        if (!logoUploadUrl) {
          toast({
            title: "Error",
            description: "Gagal mengupload logo",
            variant: "destructive",
          })
          return
        }
      }

      const templateData = {
        name: templateName,
        header_text: templateHeader,
        footer_text: templateFooter,
        logo_url: logoUploadUrl,
        branch_id: selectedBranch === "none" ? null : selectedBranch || null,
        paper_size: paperSize,
        font_size: fontSize,
        show_logo: showLogo,
        show_address: showAddress,
        show_phone: showPhone,
        show_date: showDate,
        show_barber: showBarber,
        is_active: false,
      }

      let result
      if (editingTemplateId) {
        result = await supabase.from("receipt_templates").update(templateData).eq("id", editingTemplateId)
      } else {
        result = await supabase.from("receipt_templates").insert([templateData])
      }

      if (result.error) {
        console.error("[v0] Error saving template:", result.error)
        toast({
          title: "Error",
          description: "Gagal menyimpan template",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Berhasil",
        description: editingTemplateId ? "Template berhasil diupdate" : "Template berhasil dibuat",
      })

      setIsTemplateDialogOpen(false)
      resetTemplateForm()
      fetchReceiptTemplates()
    } catch (error) {
      console.error("[v0] Error:", error)
    } finally {
      setSavingTemplate(false)
    }
  }

  const deleteTemplate = async (templateId: string) => {
    // Check if template is default
    const templateToDelete = receiptTemplates.find(t => t.id === templateId)
    
    if (templateToDelete?.is_default) {
      toast({
        title: "Tidak Dapat Menghapus",
        description: "Template default tidak bisa dihapus. Ubah template lain sebagai default terlebih dahulu.",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Yakin ingin menghapus template ini?")) return

    try {
      const { error } = await supabase.from("receipt_templates").delete().eq("id", templateId)

      if (error) {
        console.error("[v0] Error deleting template:", error)
        toast({
          title: "Error",
          description: "Gagal menghapus template",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Berhasil",
        description: "Template berhasil dihapus",
      })

      fetchReceiptTemplates()
    } catch (error) {
      console.error("[v0] Error:", error)
    }
  }

  const setActiveTemplate = async (templateId: string) => {
    try {
      // First deactivate all templates
      const { error: deactivateError } = await supabase
        .from("receipt_templates")
        .update({ is_active: false })
        .not("id", "is", null)

      if (deactivateError) {
        console.error("[v0] Error deactivating templates:", deactivateError)
        return
      }

      // Then activate the selected template
      const { error: activateError } = await supabase
        .from("receipt_templates")
        .update({ is_active: true })
        .eq("id", templateId)

      if (activateError) {
        console.error("[v0] Error activating template:", activateError)
        return
      }

      toast({
        title: "Berhasil",
        description: "Template berhasil diaktifkan",
      })

      fetchReceiptTemplates()
    } catch (error) {
      console.error("[v0] Error:", error)
    }
  }

  const deactivateTemplate = async (templateId: string) => {
    try {
      // Cek apakah ada template default
      const hasDefault = receiptTemplates.some(t => t.is_default && t.id !== templateId);
      
      if (!hasDefault) {
        toast({
          title: "Peringatan",
          description: "Harap aktifkan template default terlebih dahulu sebelum menonaktifkan template aktif ini!",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.from("receipt_templates").update({ is_active: false }).eq("id", templateId)

      if (error) {
        console.error("[v0] Error deactivating template:", error)
        return
      }

      toast({
        title: "Berhasil",
        description: "Template berhasil dinonaktifkan. Template default akan digunakan.",
      })

      fetchReceiptTemplates()
    } catch (error) {
      console.error("[v0] Error:", error)
    }
  }

  const toggleDefaultTemplate = async (templateId: string, currentDefaultStatus: boolean) => {
    try {
      if (currentDefaultStatus) {
        // Jika sudah default, cek apakah ada template aktif lain
        const hasActiveTemplate = receiptTemplates.some(t => t.is_active && t.id !== templateId);
        
        if (!hasActiveTemplate) {
          toast({
            title: "Tidak Dapat Menonaktifkan",
            description: "Tidak ada template aktif lain. Harap aktifkan template lain terlebih dahulu!",
            variant: "destructive"
          });
          return;
        }

        // Nonaktifkan default
        const { error } = await supabase
          .from("receipt_templates")
          .update({ is_default: false })
          .eq("id", templateId);

        if (error?.message) throw error;

        toast({
          title: "Berhasil",
          description: "Template default telah dinonaktifkan",
        });
      } else {
        // Cek apakah sudah ada template default lain
        const otherDefault = receiptTemplates.find(t => t.is_default && t.id !== templateId);
        
        if (otherDefault) {
          toast({
            title: "Template Default Sudah Ada",
            description: `Template "${otherDefault.name}" sudah menjadi default. Nonaktifkan terlebih dahulu.`,
            variant: "destructive"
          });
          return;
        }

        // Aktifkan sebagai default
        const { error } = await supabase
          .from("receipt_templates")
          .update({ is_default: true })
          .eq("id", templateId);

        if (error?.message) throw error;

        toast({
          title: "Berhasil",
          description: "Template berhasil diset sebagai default",
        });
      }

      fetchReceiptTemplates();
    } catch (error: any) {
      // Hanya tampilkan toast jika ada error message yang valid
      if (error?.message) {
        toast({
          title: "Error",
          description: error.message || "Gagal mengubah status default template",
          variant: "destructive"
        });
      }
      // Jangan log error kosong
    }
  }

  const handleEditTemplate = (template: ReceiptTemplate) => {
    setEditingTemplateId(template.id)
    setTemplateName(template.name)
    setTemplateHeader(template.header_text || "")
    setTemplateFooter(template.footer_text || "")
    setSelectedBranch(template.branch_id || "none")
    setPaperSize(template.paper_size || "80mm")
    setFontSize(template.font_size || "medium")
    setShowLogo(template.show_logo || false)
    setShowAddress(template.show_address || false)
    setShowPhone(template.show_phone || false)
    setShowDate(template.show_date || false)
    setShowBarber(template.show_barber || false)
    setLogoUrl(template.logo_url || "")
    setLogoPreview(template.logo_url || "")
    setIsTemplateDialogOpen(true)
  }

  const handleTestPrint = (template: ReceiptTemplate) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Print - ${template.name}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 20px; }
            .receipt { width: 300px; margin: 0 auto; }
            .center { text-align: center; }
            .logo { max-height: 60px; margin-bottom: 10px; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${template.show_logo && template.logo_url ? `<div class="center"><img src="${template.logo_url}" class="logo" alt="Logo" /></div>` : ""}
            <div class="center">${template.header_text?.replace(/\n/g, "<br>") || ""}</div>
            <div class="line"></div>
            ${template.show_date ? `<div>Tanggal: ${new Date().toLocaleDateString("id-ID")}</div>` : ""}
            ${template.show_barber ? `<div>Capster: Ahmad Rizki</div>` : ""}
            <div class="line"></div>
            <div>1x Basic Cut ........................ 25.000</div>
            <div class="line"></div>
            <div class="total">TOTAL: 25.000</div>
            <div class="line"></div>
            <div class="center">${template.footer_text?.replace(/\n/g, "<br>") || ""}</div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  const handleAddCategory = () => {
    setEditingCategory(null)
    setCategoryForm({ name: "", description: "", icon: "", sort_order: 0 })
    setIsAddCategoryDialogOpen(true)
  }

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      icon: category.icon,
      sort_order: category.sort_order,
    })
    setIsAddCategoryDialogOpen(true)
  }

  const handleAddMenuItem = () => {
    resetMenuForm()
    setIsAddMenuItemDialogOpen(true)
  }

  const handleEditMenuItem = (item: MenuItem) => {
    setMenuForm({
      name: item.name,
      description: item.description || "",
      price: item.price,
      category_id: item.category_id,
      duration: item.duration || 0,
      stock: item.stock || 0,
      type: item.type,
    })
    setEditingMenuItem(item)
    setIsAddMenuItemDialogOpen(true)
  }

  const handleAddTemplate = () => {
    resetTemplateForm()
    setIsTemplateDialogOpen(true)
  }

  const resetMenuForm = () => {
    setMenuForm({
      name: "",
      description: "",
      price: 0,
      category_id: "",
      duration: 0,
      stock: 0,
      type: "service",
    })
    setEditingMenuItem(null)
  }

  const toggleMenuStatus = async (menuId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active"

      const { error } = await supabase.from("services").update({ status: newStatus }).eq("id", menuId)

      if (error) throw error

      // Update local state
      setMenuItems((prev) => prev.map((item) => (item.id === menuId ? { ...item, status: newStatus } : item)))

      console.log(`[v0] Menu ${newStatus === "active" ? "activated" : "deactivated"} successfully`)
    } catch (error) {
      console.error("[v0] Error updating menu status:", error)
    }
  }

  const updateProductStock = async (itemId: string, newStock: number) => {
    try {
      console.log("[v0] Updating stock for item:", itemId, "to:", newStock)

      // Try to update stock, but handle gracefully if column doesn't exist
      const { error } = await supabase
        .from("services")
        .update({
          // Only include stock if it's a product, otherwise just update updated_at
          ...(newStock !== undefined && { stock: newStock }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId)

      if (error) {
        console.error("[v0] Error updating stock:", error)
        // If stock column doesn't exist, just show a warning instead of error
        if (error.message.includes("stock")) {
          toast({
            title: "Info",
            description: "Fitur stok belum tersedia. Jalankan script database terlebih dahulu.",
          })
        } else {
          toast({
            title: "Error",
            description: "Gagal mengupdate stok produk",
            variant: "destructive",
          })
        }
        return
      }

      // Update local state
      setMenuItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, stock: newStock } : item)))

      toast({
        title: "Berhasil",
        description: "Stok produk berhasil diupdate",
      })
    } catch (error) {
      console.error("[v0] Error updating stock:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengupdate stok",
        variant: "destructive",
      })
    }
  }

  const updateOutletPrice = async (itemId: string, newPrice: number) => {
    try {
      // For now, update the main price - later can be extended to outlet-specific pricing
      const { error } = await supabase.from("services").update({ price: newPrice }).eq("id", itemId)

      if (error) {
        console.error("[v0] Error updating price:", error)
        toast({
          title: "Error",
          description: "Gagal mengupdate harga produk",
          variant: "destructive",
        })
        return
      }

      // Update local state
      setMenuItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, price: newPrice } : item)))

      toast({
        title: "Berhasil",
        description: "Harga produk berhasil diupdate",
      })
    } catch (error) {
      console.error("[v0] Error updating price:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengupdate harga",
        variant: "destructive",
      })
    }
  }

  const updateMenuStatus = async (itemId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("services").update({ status: newStatus }).eq("id", itemId)

      if (error) {
        console.error("[v0] Error updating menu status:", error)
        toast({
          title: "Error",
          description: "Gagal mengupdate status menu",
          variant: "destructive",
        })
        return
      }

      // Update local state
      setMenuItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item)))

      toast({
        title: "Berhasil",
        description: "Status menu berhasil diupdate",
      })
    } catch (error) {
      console.error("[v0] Error updating menu status:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengupdate status",
        variant: "destructive",
      })
    }
  }

  const activeMenuCount = menuItems.filter((item) => item.status === "active").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            Kelola Menu Kasir
          </h1>
          <p className="text-gray-600 mt-2">Kelola kategori, layanan, dan produk yang ditampilkan di kasir</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 bg-white hover:bg-gray-50 border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Outlet Selector */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">Kelola Stok per Outlet</h3>
          <p className="text-sm text-blue-600">Pilih outlet untuk melihat dan mengelola stok</p>
        </div>
        
        <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Pilih Outlet" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          onClick={() => selectedOutlet && fetchOutletStock(selectedOutlet)}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Peringatan Stok Rendah
            </CardTitle>
            <CardDescription>
              {lowStockAlerts.length} produk membutuhkan restok segera
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded">
                  <div>
                    <div className="font-medium">{alert.service?.name}</div>
                    <div className="text-sm text-gray-600">
                      {alert.branch?.name} - Stok: {alert.stock_quantity}
                    </div>
                  </div>
                  <Badge variant="destructive">
                    Restok Needed
                  </Badge>
                </div>
              ))}
              {lowStockAlerts.length > 5 && (
                <div className="text-center text-sm text-red-600">
                  +{lowStockAlerts.length - 5} produk lainnya membutuhkan restok
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Kategori</p>
                <p className="text-2xl font-bold text-blue-900">{categories.length}</p>
                <p className="text-blue-500 text-xs mt-1">kategori tersedia</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-full">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Menu Aktif</p>
                <p className="text-2xl font-bold text-green-900">{activeMenuCount}</p>
                <p className="text-green-500 text-xs mt-1">dari {menuItems.length} total</p>
              </div>
              <div className="bg-green-500 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Total Menu</p>
                <p className="text-2xl font-bold text-red-900">{menuItems.length}</p>
                <p className="text-red-500 text-xs mt-1">layanan & produk</p>
              </div>
              <div className="bg-red-500 p-3 rounded-full">
                <Menu className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Total Nilai</p>
                <p className="text-2xl font-bold text-orange-900">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                  }).format(totalRevenue)}
                </p>
                <p className="text-orange-500 text-xs mt-1">dari semua menu</p>
              </div>
              <div className="bg-orange-500 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="kelola-menu" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger
            value="kelola-menu"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Package className="h-4 w-4 mr-2" />
            Kelola Menu
          </TabsTrigger>
          <TabsTrigger
            value="outlet"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Store className="h-4 w-4 mr-2" />
            Outlet
          </TabsTrigger>
          <TabsTrigger
            value="template-struk"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Template Struk
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kelola-menu" className="space-y-8">
          {/* Categories Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Kategori Menu</h2>
                <p className="text-gray-600">Kelola kategori untuk mengelompokkan layanan dan produk</p>
              </div>
              <Button onClick={handleAddCategory} className="gap-2 bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4" />
                Tambah Kategori
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categoriesLoading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Memuat kategori...</p>
                </div>
              ) : categories.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-600">Belum ada kategori. Tambahkan kategori pertama Anda!</p>
                </div>
              ) : (
                categories.map((category) => (
                  <Card key={category.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg`}>
                            {category.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold">{category.name}</h3>
                            <p className="text-sm text-gray-600">{category.description}</p>
                          </div>
                        </div>
                        <Badge variant={category.status === "active" ? "default" : "secondary"}>
                          {category.status === "active" ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <span>{category.itemCount || 0} item</span>
                        <span>Urutan: {category.sort_order}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditCategory(category)}
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button onClick={() => deleteCategory(category.id)} variant="outline" size="sm">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Menu & Products Section */}
          <div className="space-y-6 border-t pt-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Menu & Produk</h2>
                <p className="text-gray-600">Kelola layanan dan produk yang tersedia di kasir</p>
              </div>
              <Button onClick={handleAddMenuItem} className="gap-2 bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4" />
                Tambah Menu
              </Button>
            </div>

            {/* Filter Card */}
            <Card>
              <CardHeader>
                <CardTitle>Filter & Pencarian</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Cari menu..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tipe</SelectItem>
                      <SelectItem value="service">🔧 Layanan</SelectItem>
                      <SelectItem value="product">📦 Produk</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setFilterCategory("all")
                      setFilterType("all")
                      setFilterStatus("all")
                    }}
                  >
                    Reset Filter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItemsLoading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Memuat menu...</p>
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-600">Tidak ada menu ditemukan</p>
                </div>
              ) : (
                filteredMenuItems.map((item) => {
                  const currentOutletStock = outletStock.find(os => os.service_id === item.id);
                  const currentStock = currentOutletStock?.stock_quantity || 0;
                  const minStock = currentOutletStock?.min_stock_threshold || 5;

                  return (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            {item.category && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs">{item.category.icon}</span>
                                <span className="text-xs text-gray-500">{item.category.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">Rp {item.price.toLocaleString("id-ID")}</div>
                            <Badge variant={item.type === "service" ? "default" : "secondary"} className="text-xs">
                              {item.type === "service" ? "Layanan" : "Produk"}
                            </Badge>
                            <Badge variant={item.status === "active" ? "default" : "secondary"} className="text-xs mt-1">
                              {item.status === "active" ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          {item.type === "service" && item.duration && (
                            <div>
                              <span className="font-medium">Durasi:</span> {item.duration} menit
                            </div>
                          )}
                          {item.type === "product" && (
                            <div>
                              <span className="font-medium">Stok:</span> {currentStock}
                            </div>
                          )}
                          {item.totalOrders && (
                            <div>
                              <span className="font-medium">Terjual:</span> {item.totalOrders}x
                            </div>
                          )}
                          {item.totalRevenue && (
                            <div>
                              <span className="font-medium">Revenue:</span> Rp {item.totalRevenue.toLocaleString("id-ID")}
                            </div>
                          )}
                        </div>

                        {/* Outlet Stock Management */}
                        {item.type === "product" && selectedOutlet && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">Stok {branches.find(b => b.id === selectedOutlet)?.name}:</span>
                              {stockLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={currentStock}
                                    onChange={(e) => {
                                      const newStock = parseInt(e.target.value) || 0;
                                      handleUpdateStock(item.id, newStock);
                                    }}
                                    className="w-20 h-8 text-sm"
                                  />
                                  <span className="text-xs text-gray-500">
                                    Min: {minStock}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Low stock warning */}
                            {currentStock <= minStock && (
                              <div className="mt-1 text-xs text-red-500 font-medium">
                                ⚠️ Stok hampir habis!
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={() => handleEditMenuItem(item)}
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button onClick={() => deleteMenuItem(item.id)} variant="outline" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="outlet" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Kontrol Menu per Outlet</h2>
              <p className="text-gray-600">Atur menu, stok, dan harga yang tersedia di setiap outlet</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Pilih Outlet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Pilih outlet..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedOutlet && (
            <div className="space-y-4">
              {Object.entries(
                filteredMenuItems.reduce(
                  (acc, item) => {
                    const categoryName = item.category?.name || "Lainnya"
                    if (!acc[categoryName]) acc[categoryName] = []
                    acc[categoryName].push(item)
                    return acc
                  },
                  {} as Record<string, typeof filteredMenuItems>,
                ),
              ).map(([categoryName, items]) => (
                <Card key={categoryName} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-gray-800">{categoryName}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {items.map((item) => {
                        const isProduct = item.type === "product"
                        const currentStock = outletStock.find(os => os.service_id === item.id)?.stock_quantity || 0
                        const minStock = outletStock.find(os => os.service_id === item.id)?.min_stock_threshold || 5

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                                <Badge variant={isProduct ? "secondary" : "outline"} className="text-xs">
                                  {isProduct ? "Produk" : "Layanan"}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="font-medium">Rp {item.price?.toLocaleString()}</span>
                                {!isProduct && item.duration && <span>{item.duration} menit</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 ml-4">
                              {/* Stock Control for Products */}
                              {isProduct && (
                                <div className="flex items-center gap-2">
                                  <label className="text-xs font-medium text-gray-600 min-w-0">Stok:</label>
                                  <div className="flex items-center gap-1">
                                    <Package className="h-3 w-3 text-gray-400" />
                                    <Input
                                      type="number"
                                      min="0"
                                      value={currentStock}
                                      onChange={(e) => {
                                        const newStock = Number.parseInt(e.target.value) || 0
                                        handleUpdateStock(item.id, newStock)
                                      }}
                                      className="h-8 w-20 text-sm"
                                    />
                                  </div>
                                  {currentStock <= minStock && (
                                    <Badge variant="destructive" className="text-xs">
                                      Low Stock
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Status Toggle */}
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-600">Status:</label>
                                <div className="flex items-center gap-2">
                                  <Badge variant={item.status === "active" ? "default" : "secondary"} className="text-xs">
                                    {item.status === "active" ? "Aktif" : "Nonaktif"}
                                  </Badge>
                                  <Switch
                                    checked={item.status === "active"}
                                    onCheckedChange={(checked) => {
                                      const newStatus = checked ? "active" : "inactive"
                                      updateMenuStatus(item.id, newStatus)
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="template-struk" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Template Struk</h2>
              <p className="text-gray-600">Kelola tampilan dan format struk pembayaran</p>
            </div>
            <Button onClick={handleAddTemplate} className="gap-2 bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4" />
              Template Baru
            </Button>
          </div>

          {/* Active Template Display */}
          {receiptTemplates.find((t) => t.is_active) && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">Template Aktif</Badge>
                  <CardTitle className="text-lg">{receiptTemplates.find((t) => t.is_active)?.name}</CardTitle>
                </div>
                <CardDescription>Template ini sedang digunakan untuk semua transaksi di kasir</CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Template List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receiptLoading ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Memuat template...</p>
              </div>
            ) : receiptTemplates.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-600">Belum ada template. Buat template pertama Anda!</p>
              </div>
            ) : (
              receiptTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`hover:shadow-lg transition-shadow ${
                    template.is_active 
                      ? "ring-2 ring-green-500" 
                      : template.is_default 
                      ? "ring-2 ring-blue-400" 
                      : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        {template.name}
                      </CardTitle>
                      <div className="flex flex-wrap gap-1">
                        {template.is_active && <Badge className="bg-green-100 text-green-800 text-xs">Aktif</Badge>}
                        {template.is_default && <Badge className="bg-blue-100 text-blue-800 text-xs">Default</Badge>}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Template Preview */}
                    <div className="bg-white border rounded p-3 text-xs font-mono">
                      {template.show_logo && template.logo_url && (
                        <div className="text-center mb-2">
                          <img
                            src={template.logo_url || "/images/pigtown-logo.png"}
                            alt="Logo"
                            className="h-12 w-auto mx-auto"
                            onError={(e) => {
                              console.log("[v0] Logo failed to load:", template.logo_url)
                              e.currentTarget.style.display = "none"
                            }}
                          />
                        </div>
                      )}
                      <div className="text-center border-b pb-2 mb-2">
                        {template.header_text?.split("\n").map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Basic Cut</span>
                          <span>25.000</span>
                        </div>
                        <div className="border-t pt-1 flex justify-between font-bold">
                          <span>TOTAL</span>
                          <span>25.000</span>
                        </div>
                      </div>
                      <div className="text-center border-t pt-2 mt-2">
                        {template.footer_text?.split("\n").map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    </div>

                    {/* Toggle Default - Full Width */}
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Template Default</span>
                      </div>
                      <Switch
                        checked={template.is_default || false}
                        onCheckedChange={() => toggleDefaultTemplate(template.id, template.is_default || false)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>

                    {/* Template Actions - Responsive Grid Layout */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleEditTemplate(template)}
                        size="sm"
                        variant="outline"
                        className="w-full gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        onClick={() => handleTestPrint(template)}
                        size="sm"
                        variant="outline"
                        className="w-full gap-1"
                      >
                        <Printer className="h-3 w-3" />
                        <span className="hidden sm:inline">Test Print</span>
                      </Button>
                      <Button
                        onClick={() => deleteTemplate(template.id)}
                        size="sm"
                        variant="destructive"
                        className="w-full gap-1"
                        disabled={template.is_default}
                        title={template.is_default ? "Template default tidak bisa dihapus" : "Hapus template"}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Hapus</span>
                      </Button>
                      {template.is_active ? (
                        <Button
                          onClick={() => deactivateTemplate(template.id)}
                          size="sm"
                          variant="outline"
                          className="w-full gap-1"
                        >
                          <X className="h-3 w-3" />
                          <span className="hidden sm:inline">Nonaktifkan</span>
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => setActiveTemplate(template.id)} 
                          size="sm" 
                          className="w-full gap-1 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-3 w-3" />
                          <span className="hidden sm:inline">Aktifkan</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update informasi kategori"
                : "Buat kategori baru untuk mengelompokkan layanan dan produk"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nama Kategori</label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Potong Rambut"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Deskripsi</label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Deskripsi kategori..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Icon</label>
              <Input
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, icon: e.target.value }))}
                placeholder="✂️"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Urutan</label>
              <Input
                type="number"
                value={categoryForm.sort_order}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, sort_order: Number.parseInt(e.target.value) || 0 }))
                }
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={editingCategory ? updateCategory : createCategory} disabled={saving}>
              {saving ? "Menyimpan..." : editingCategory ? "Update" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMenuItemDialogOpen} onOpenChange={setIsAddMenuItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMenuItem ? "Edit Menu" : "Tambah Menu Baru"}</DialogTitle>
            <DialogDescription>
              {editingMenuItem ? "Update informasi menu" : "Tambahkan layanan atau produk baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nama Menu</label>
              <Input
                value={menuForm.name}
                onChange={(e) => setMenuForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Basic Cut"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Deskripsi</label>
              <Textarea
                value={menuForm.description}
                onChange={(e) => setMenuForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Deskripsi menu..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Harga</label>
                <Input
                  type="number"
                  value={menuForm.price}
                  onChange={(e) => setMenuForm((prev) => ({ ...prev, price: Number.parseInt(e.target.value) || 0 }))}
                  placeholder="25000"
                />
              </div>
              {menuForm.type === "service" ? (
                <div>
                  <label className="text-sm font-medium">Durasi (menit)</label>
                  <Input
                    type="number"
                    value={menuForm.duration}
                    onChange={(e) =>
                      setMenuForm((prev) => ({ ...prev, duration: Number.parseInt(e.target.value) || 0 }))
                    }
                    placeholder="30"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium">Stok</label>
                  <Input
                    type="number"
                    value={menuForm.stock}
                    onChange={(e) => setMenuForm((prev) => ({ ...prev, stock: Number.parseInt(e.target.value) || 0 }))}
                    placeholder="100"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Kategori</label>
              <Select
                value={menuForm.category_id}
                onChange={(value) => setMenuForm((prev) => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tipe</label>
              <Select
                value={menuForm.type}
                onChange={(value: "service" | "product") => setMenuForm((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={menuForm.type === "service" ? "🔧 Layanan" : "📦 Produk"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">🔧 Layanan</SelectItem>
                  <SelectItem value="product">📦 Produk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMenuItemDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={editingMenuItem ? updateMenuItem : createMenuItem} disabled={saving}>
              {saving ? "Menyimpan..." : editingMenuItem ? "Update" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog - keeping existing template dialog code */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplateId ? "Edit Template Struk" : "Template Struk Baru"}</DialogTitle>
            <DialogDescription>Atur tampilan dan format struk pembayaran yang akan dicetak</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nama Template</label>
                <Input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Nama template..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Cabang</label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Cabang (Opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Cabang</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Ukuran Kertas</label>
                <Select value={paperSize} onValueChange={setPaperSize}>
                  <SelectTrigger>
                    <SelectValue value={paperSize} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80mm">80mm</SelectItem>
                    <SelectItem value="58mm">58mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Ukuran Font</label>
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger>
                    <SelectValue value={fontSize} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Kecil</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="large">Besar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Template Content */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Header Text</label>
                <Textarea
                  value={templateHeader}
                  onChange={(e) => setTemplateHeader(e.target.value)}
                  placeholder="Teks di bagian atas struk..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Footer Text</label>
                <Textarea
                  value={templateFooter}
                  onChange={(e) => setTemplateFooter(e.target.value)}
                  placeholder="Teks di bagian bawah struk..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Logo (Opsional)</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setLogoFile(file)
                      setLogoPreview(URL.createObjectURL(file))
                    }
                  }}
                />
                {logoPreview && (
                  <img src={logoPreview || "/placeholder.svg"} alt="Logo Preview" className="mt-2 max-h-20" />
                )}
              </div>
            </div>
          </div>

          {/* Checkbox Options */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="inline-flex items-center">
                <Input
                  type="checkbox"
                  checked={showLogo}
                  onChange={(e) => setShowLogo(e.target.checked)}
                  className="mr-2"
                />
                Tampilkan Logo
              </label>
            </div>
            <div>
              <label className="inline-flex items-center">
                <Input
                  type="checkbox"
                  checked={showAddress}
                  onChange={(e) => setShowAddress(e.target.checked)}
                  className="mr-2"
                />
                Tampilkan Alamat
              </label>
            </div>
            <div>
              <label className="inline-flex items-center">
                <Input
                  type="checkbox"
                  checked={showPhone}
                  onChange={(e) => setShowPhone(e.target.checked)}
                  className="mr-2"
                />
                Tampilkan Telepon
              </label>
            </div>
            <div>
              <label className="inline-flex items-center">
                <Input
                  type="checkbox"
                  checked={showDate}
                  onChange={(e) => setShowDate(e.target.checked)}
                  className="mr-2"
                />
                Tampilkan Tanggal
              </label>
            </div>
            <div>
              <label className="inline-flex items-center">
                <Input
                  type="checkbox"
                  checked={showCashier}
                  onChange={(e) => setShowCashier(e.target.checked)}
                  className="mr-2"
                />
                Tampilkan Kasir
              </label>
            </div>
            <div>
              <label className="inline-flex items-center">
                <Input
                  type="checkbox"
                  checked={showBarber}
                  onChange={(e) => setShowBarber(e.target.checked)}
                  className="mr-2"
                />
                Tampilkan Capster
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Batal
            </Button>
            <Button type="button" disabled={savingTemplate} onClick={handleSaveTemplate}>
              {savingTemplate ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CashierManagement
