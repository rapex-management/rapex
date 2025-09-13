import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { Sidebar } from '../../../components/ui/Sidebar';
import { Card } from '../../../components/ui/Card';
import { PageLoader } from '../../../components/ui/LoadingSpinner';
import { MerchantAuthGuard } from '../../../lib/auth/guards/MerchantAuthGuard';
import { useMerchantAuth } from '../../../lib/auth/hooks/useMerchantAuth';
import api from '../../../services/api';

interface ProductType { type_id: number; name: number; }
interface Category { category_id: number; name: string; parent: number | null; subcategories: Category[]; }
interface Brand { brand_id: number; name: string; description: string; }
interface ProductImage { image_url: string; is_primary: boolean; alt_text: string; order: number; file?: File; preview?: string; }
interface ProductVariant { variant_name: string; price_difference: number; stock: number; sku: string; }
interface ProductTag { tag_name: string; }

const AddProductPage = memo(() => {
  const { user } = useMerchantAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const sidebarItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', href: '/merchant/dashboard', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7z" /></svg>) },
    { id: 'products', label: 'Products', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>), children: [
      { id: 'my-products', label: 'My Products', href: '/merchant/products', icon: <div className="w-2 h-2 bg-blue-500 rounded-full" /> },
      { id: 'add-product', label: 'Add New Products', href: '/merchant/products/add', icon: <div className="w-2 h-2 bg-green-500 rounded-full" /> },
      { id: 'bulk-upload-products', label: 'Bulk Upload', href: '/merchant/products/bulk', icon: <div className="w-2 h-2 bg-purple-500 rounded-full" /> },
    ] },
  ], []);

  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', stock: '', type: '', category: '', brand: '', status: 'draft', sku: '', weight: '',
    dimensions: { length: '', width: '', height: '' }
  });
  const [images, setImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const [typesRes, categoriesRes, brandsRes] = await Promise.all([
          api.get('/products/types/'),
          api.get('/products/categories/'),
          api.get('/products/brands/'),
        ]);
        setProductTypes(typesRes.data);
        setCategories(categoriesRes.data);
        setBrands(brandsRes.data);
      } catch {
        // Intentionally silent; consider adding toast/notification
      }
    })();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('dimensions.')) {
  const key = name.split('.')[1] as keyof typeof formData.dimensions;
  setFormData(p => ({ ...p, dimensions: { ...p.dimensions, [key]: value } }));
    } else {
      setFormData(p => ({ ...p, [name]: value }));
    }
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleImageFiles = useCallback((files: File[]) => {
    files.filter(f => f.type.startsWith('image/')).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setImages(prev => [...prev, {
        image_url: '', is_primary: prev.length === 0, alt_text: file.name, order: prev.length, file, preview: ev.target?.result as string
      }]);
      reader.readAsDataURL(file);
    });
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    handleImageFiles(Array.from(e.dataTransfer.files));
  }, [handleImageFiles]);

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleImageFiles(Array.from(e.target.files));
  };

  const setPrimary = (i: number) => setImages(prev => prev.map((img, idx) => ({ ...img, is_primary: idx === i })));
  const removeImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i));
  const addVariant = () => setVariants(v => [...v, { variant_name: '', price_difference: 0, stock: 0, sku: '' }]);
  const changeVariant = (i: number, field: keyof ProductVariant, value: string | number) => setVariants(v => v.map((vv, idx) => idx === i ? { ...vv, [field]: value } : vv));
  const removeVariant = (i: number) => setVariants(v => v.filter((_, idx) => idx !== i));
  const addTag = () => { if (newTag.trim() && !tags.some(t => t.tag_name === newTag.trim())) { setTags(t => [...t, { tag_name: newTag.trim() }]); setNewTag(''); } };
  const removeTag = (i: number) => setTags(t => t.filter((_, idx) => idx !== i));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Required';
    if (!formData.description.trim()) errs.description = 'Required';
    if (!formData.price || parseFloat(formData.price) <= 0) errs.price = 'Invalid';
    if (!formData.stock || parseInt(formData.stock) < 0) errs.stock = 'Invalid';
    if (!formData.type) errs.type = 'Required';
    if (!formData.category) errs.category = 'Required';
    if (!images.length) errs.images = 'At least one image required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const uploadImages = async () => {
    const out: ProductImage[] = [];
    setUploadingImages(true);
    try {
      for (const img of images) {
        if (img.file) {
          const fd = new FormData();
          fd.append('image', img.file);
          fd.append('alt_text', img.alt_text);
          fd.append('is_primary', String(img.is_primary));
            const res = await api.post('/products/upload-image/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          out.push({ ...img, image_url: res.data.image_url });
        } else out.push(img);
      }
      return out;
    } finally { setUploadingImages(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const uploaded = await uploadImages();
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        weight: formData.weight ? parseFloat(formData.weight) : null,
        dimensions: Object.fromEntries(Object.entries(formData.dimensions).map(([k,v]) => [k, v ? parseFloat(v as string) : null])),
        images: uploaded.map(i => ({ image_url: i.image_url, is_primary: i.is_primary, alt_text: i.alt_text, order: i.order })),
        variants: variants.filter(v => v.variant_name.trim()),
        tags
      };
      await api.post('/products/', payload);
      router.push('/merchant/products?created=true');
    } catch (err) {
      // Narrowly attempt to read API error shape
      const apiData = (err as { response?: { data?: unknown } })?.response?.data;
      if (apiData && typeof apiData === 'object') setErrors((prev) => ({ ...prev, form: 'Server validation failed' }));
    } finally { setLoading(false); }
  };

  const steps = [
    { id: 1, name: 'Basic Info', description: 'Product details' },
    { id: 2, name: 'Images', description: 'Photos' },
    { id: 3, name: 'Variants & Tags', description: 'Options' }
  ];
  const next = () => currentStep < steps.length && setCurrentStep(s => s + 1);
  const prev = () => currentStep > 1 && setCurrentStep(s => s - 1);

  if (!user) return <PageLoader />;

  return (
    <MerchantAuthGuard requireActive={false}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          items={sidebarItems}
          userInfo={{
            name: user.merchant_name || user.owner_name || user.username || 'Merchant',
            email: user.email,
            role: 'Merchant'
          }}
          onLogout={() => {/* no-op for now */}}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <Link href="/merchant/products" className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
                    <p className="mt-1 text-sm text-gray-500">Create a new product for your shop</p>
                  </div>
                </div>
                <button onClick={() => router.push('/merchant/products')} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>

              {/* Progress */}
              <div className="mb-8 flex items-center justify-between">
                {steps.map((s, idx) => (
                  <div key={s.id} className="flex items-center w-full">
                    <div className={`flex items-center ${idx < steps.length -1 ? 'w-full' : ''}`}>
                      <div className={`w-10 h-10 flex items-center justify-center rounded-full border-2 text-sm font-medium transition-all ${s.id <= currentStep ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-500 text-white' : 'border-gray-300 text-gray-500'}`}>
                        {s.id < currentStep ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : s.id}
                      </div>
                      <div className="ml-3">
                        <p className={`text-sm font-medium ${s.id <= currentStep ? 'text-blue-600' : 'text-gray-500'}`}>{s.name}</p>
                        <p className="text-xs text-gray-400">{s.description}</p>
                      </div>
                    </div>
                    {idx < steps.length -1 && (
                      <div className="flex-1 mx-4 h-0.5 bg-gray-200">
                        <div className={`h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all ${s.id < currentStep ? 'w-full' : 'w-0'}`} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="pb-20">
                {/* Step 1 */}
                {currentStep === 1 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    <div className="lg:col-span-2 space-y-6">
                      <Card variant="elevated" className="border-l-4 border-l-blue-500">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                          <svg className="h-6 w-6 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Basic Information
                        </h3>
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-semibold mb-2">Product Name *</label>
                              <input name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2">SKU</label>
                              <input name="sku" value={formData.sku} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2">Description *</label>
                            <textarea name="description" rows={4} value={formData.description} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-semibold mb-2">Price (₱) *</label>
                              <input type="number" name="price" min="0" step="0.01" value={formData.price} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2">Stock *</label>
                              <input type="number" name="stock" min="0" value={formData.stock} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                              {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <label className="block text-sm font-semibold mb-2">Product Type *</label>
                              <select name="type" value={formData.type} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">Select Type</option>
                                {productTypes.map(t => <option key={t.type_id} value={t.name}>{t.name === 0 && 'Shop'}{t.name === 1 && 'Pre-loved'}{t.name === 2 && 'Ready-to-Eat'}{t.name === 3 && 'Fresh'}</option>)}
                              </select>
                              {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2">Category *</label>
                              <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                              </select>
                              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2">Brand</label>
                              <select name="brand" value={formData.brand} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">Select Brand</option>
                                {brands.map(b => <option key={b.brand_id} value={b.brand_id}>{b.name}</option>)}
                              </select>
                            </div>
                          </div>
                          <Card variant="outlined">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              Additional Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-2">Weight (kg)</label>
                                <input type="number" name="weight" step="0.01" min="0" value={formData.weight} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Status</label>
                                <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                  <option value="draft">Draft</option>
                                  <option value="active">Active</option>
                                </select>
                              </div>
                            </div>
                            <div className="mt-6">
                              <label className="block text-sm font-medium mb-3">Dimensions (cm)</label>
                              <div className="grid grid-cols-3 gap-4">
                                {(['length','width','height'] as const).map(dim => (
                                  <input
                                    key={dim}
                                    type="number"
                                    name={`dimensions.${dim}`}
                                    step="0.01"
                                    min="0"
                                    value={formData.dimensions[dim]}
                                    onChange={handleInputChange}
                                    placeholder={dim.charAt(0).toUpperCase()+dim.slice(1)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                                  />
                                ))}
                              </div>
                            </div>
                          </Card>
                        </div>
                      </Card>
                    </div>
                    <div className="space-y-6">
                      <Card variant="gradient">
                        <h4 className="text-lg font-semibold mb-4">Quick Tips</h4>
                        <ul className="space-y-3 text-sm text-gray-600 list-disc list-inside">
                          <li>Use descriptive names customers search for.</li>
                          <li>Provide detailed descriptions.</li>
                          <li>Set competitive pricing.</li>
                        </ul>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Step 2 */}
                {currentStep === 2 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    <div className="lg:col-span-2">
                      <Card variant="elevated" className="border-l-4 border-l-purple-500">
                        <h3 className="text-xl font-semibold mb-6 flex items-center">
                          <svg className="h-6 w-6 text-purple-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Product Images
                        </h3>
                        <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} className={`border-2 border-dashed rounded-xl p-8 text-center transition ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                          <div className="mt-4">
                            <p className="text-lg font-medium">Drop images here</p>
                            <p className="text-sm text-gray-500">or click to browse</p>
                          </div>
                          <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageInputChange} className="hidden" />
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 px-6 py-3 rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">Choose Files</button>
                          {errors.images && <p className="text-red-500 text-sm mt-2">{errors.images}</p>}
                        </div>
                        {images.length > 0 && (
                          <div className="mt-8">
                            <h4 className="text-lg font-medium mb-4">Uploaded Images ({images.length})</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {images.map((img, i) => (
                                <div key={i} className="relative group">
                                  <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                                    {img.preview && <Image src={img.preview} alt={img.alt_text} fill className="object-cover" />}
                                    {img.is_primary && <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">Primary</div>}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-2">
                                      {!img.is_primary && <button type="button" onClick={() => setPrimary(i)} className="p-2 bg-white rounded-full" title="Set primary"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg></button>}
                                      <button type="button" onClick={() => removeImage(i)} className="p-2 bg-red-500 text-white rounded-full" title="Remove"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </div>
                                  </div>
                                  <input value={img.alt_text} onChange={e => setImages(prev => prev.map((im, idx) => idx === i ? { ...im, alt_text: e.target.value } : im))} className="mt-2 w-full text-xs px-2 py-1 border rounded" placeholder="Alt text" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    </div>
                    <div className="space-y-6">
                      <Card variant="gradient">
                        <h4 className="text-lg font-semibold mb-4">Image Guidelines</h4>
                        <ul className="space-y-3 text-sm text-gray-600 list-disc list-inside">
                          <li>High quality (≥800x800px).</li>
                          <li>Multiple angles help conversions.</li>
                          <li>Clean, well lit backgrounds.</li>
                        </ul>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {currentStep === 3 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    <div className="lg:col-span-2 space-y-6">
                      <Card variant="elevated" className="border-l-4 border-l-green-500">
                        <h3 className="text-xl font-semibold mb-6 flex items-center">
                          <svg className="h-6 w-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                          Product Variants (Optional)
                        </h3>
                        {variants.length === 0 ? (
                          <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            <h4 className="mt-2 text-lg font-medium">No variants added</h4>
                            <p className="mt-1 text-sm text-gray-500">Add sizes, colors, or styles</p>
                            <button type="button" onClick={addVariant} className="mt-4 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 inline-flex items-center">
                              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              Add First Variant
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {variants.map((v,i) => (
                              <div key={i} className="p-4 border rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <input value={v.variant_name} onChange={e => changeVariant(i,'variant_name', e.target.value)} placeholder="Variant name" className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-green-500" />
                                  <input type="number" step="0.01" value={v.price_difference} onChange={e => changeVariant(i,'price_difference', parseFloat(e.target.value)||0)} placeholder="Price diff" className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-green-500" />
                                  <input type="number" value={v.stock} onChange={e => changeVariant(i,'stock', parseInt(e.target.value)||0)} placeholder="Stock" className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-green-500" />
                                  <div className="flex items-center justify-end">
                                    <button type="button" onClick={() => removeVariant(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Remove">
                                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button type="button" onClick={addVariant} className="w-full p-3 border-2 border-dashed rounded-lg text-gray-500 hover:border-green-300 hover:text-green-600">Add Another Variant</button>
                          </div>
                        )}
                      </Card>
                      <Card variant="outlined">
                        <h4 className="text-lg font-semibold mb-4 flex items-center">
                          <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                          Tags (Optional)
                        </h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {tags.map((t,i)=>(
                            <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                              {t.tag_name}
                              <button type="button" onClick={()=>removeTag(i)} className="ml-2 text-blue-600 hover:text-blue-800">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <input value={newTag} onChange={e=>setNewTag(e.target.value)} onKeyDown={e=> e.key==='Enter' && (e.preventDefault(), addTag())} placeholder="Add a tag..." className="flex-1 px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500" />
                          <button type="button" onClick={addTag} disabled={!newTag.trim()} className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">Add</button>
                        </div>
                      </Card>
                    </div>
                    <div className="space-y-6">
                      <Card variant="gradient">
                        <h4 className="text-lg font-semibold mb-4">Variants & Tags Tips</h4>
                        <ul className="space-y-3 text-sm text-gray-600 list-disc list-inside">
                          <li>Use variants for sizes/colors.</li>
                          <li>Tags improve discoverability.</li>
                          <li>Manage stock per variant.</li>
                        </ul>
                      </Card>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mt-12 pt-6 border-t border-gray-200">
                  <div>
                    {currentStep > 1 && (
                      <button type="button" onClick={prev} className="px-6 py-3 border rounded-lg text-gray-700 hover:bg-gray-50 inline-flex items-center">
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Previous
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    {currentStep < steps.length ? (
                      <button type="button" onClick={next} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg inline-flex items-center">Next<svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                    ) : (
                      <button type="submit" disabled={loading || uploadingImages} className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg inline-flex items-center disabled:opacity-50">
                        {loading || uploadingImages ? (
                          <>
                            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            {uploadingImages ? 'Uploading...' : 'Creating...'}
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Create Product
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {errors.form && <p className="mt-4 text-sm text-red-500">{errors.form}</p>}
              </form>
            </div>
          </main>
        </div>
      </div>
    </MerchantAuthGuard>
  );
});

AddProductPage.displayName = 'AddProductPage';
export default AddProductPage;
