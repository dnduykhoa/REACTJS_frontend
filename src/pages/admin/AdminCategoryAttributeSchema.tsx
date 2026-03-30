import { useEffect, useMemo, useState } from 'react';
import {
  attributeDefinitionApi,
  attributeGroupApi,
  categoryApi,
  categoryAttributeApi,
} from '../../api/j2ee';
import type {
  AttributeDefinition,
  AttributeGroup,
  Category,
  CategoryAttributeSchema,
  CategoryAttributeSchemaGroup,
  CategoryAttributeSchemaItem,
} from '../../api/j2ee/types';
import { AlertCircle, ArrowRightLeft, FolderTree, Plus, Search, Trash2 } from 'lucide-react';
import Pagination from '../../components/Pagination';

const LEFT_PAGE_SIZE = 12;

function buildCategoryTree(categories: Category[]): { cat: Category; depth: number }[] {
  const childrenMap = new Map<number | null, Category[]>();

  for (const cat of categories) {
    const parentId = cat.parent?.id ?? null;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)?.push(cat);
  }

  for (const list of childrenMap.values()) {
    list.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  const result: { cat: Category; depth: number }[] = [];

  const walk = (parentId: number | null, depth: number) => {
    const list = childrenMap.get(parentId) ?? [];
    for (const cat of list) {
      result.push({ cat, depth });
      walk(cat.id, depth + 1);
    }
  };

  walk(null, 0);

  const seen = new Set(result.map((x) => x.cat.id));
  for (const cat of categories) {
    if (!seen.has(cat.id)) result.push({ cat, depth: 0 });
  }

  return result;
}

function getApiMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    fallback
  );
}

export default function AdminCategoryAttributeSchema() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
  const [attributeDefs, setAttributeDefs] = useState<AttributeDefinition[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [schema, setSchema] = useState<CategoryAttributeSchema | null>(null);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [leftPage, setLeftPage] = useState(1);
  const [error, setError] = useState('');

  const [newIsRequired, setNewIsRequired] = useState(false);
  const [newDisplayOrder, setNewDisplayOrder] = useState('0');
  const [newGroupId, setNewGroupId] = useState<string>('');

  const sortedCategories = useMemo(() => buildCategoryTree(categories), [categories]);

  const loadSchema = async (categoryId: number) => {
    setLoadingSchema(true);
    setError('');

    try {
      const response = await categoryAttributeApi.getSchema(categoryId);
      setSchema(response.data.data);
    } catch (err: unknown) {
      setSchema(null);
      setError(getApiMessage(err, 'Không thể tải schema thuộc tính của danh mục'));
    } finally {
      setLoadingSchema(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoadingInit(true);
      try {
        const [categoryRes, groupRes, attrDefRes] = await Promise.all([
          categoryApi.getActive(),
          attributeGroupApi.getActive(),
          attributeDefinitionApi.getActive(),
        ]);

        setCategories(categoryRes.data.data);
        setGroups(groupRes.data.data);
        setAttributeDefs(attrDefRes.data.data);
      } catch (err: unknown) {
        setError(getApiMessage(err, 'Không thể tải dữ liệu danh mục / nhóm / thuộc tính'));
      } finally {
        setLoadingInit(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    setLeftPage(1);
  }, [search, selectedCategoryId]);

  const assignedDefIds = useMemo(() => {
    const allItems = schema?.groups.flatMap((group) => group.items) ?? [];
    return new Set(allItems.map((item) => item.attrDefId));
  }, [schema]);

  const filteredDefs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return attributeDefs
      .filter((attr) => !assignedDefIds.has(attr.id))
      .filter((attr) => {
        if (!keyword) return true;
        return [attr.name, attr.attrKey].some((x) => x.toLowerCase().includes(keyword));
      })
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  }, [attributeDefs, assignedDefIds, search]);

  const leftPageCount = Math.max(1, Math.ceil(filteredDefs.length / LEFT_PAGE_SIZE));

  const pagedDefs = useMemo(() => {
    return filteredDefs.slice((leftPage - 1) * LEFT_PAGE_SIZE, leftPage * LEFT_PAGE_SIZE);
  }, [filteredDefs, leftPage]);

  useEffect(() => {
    if (leftPage > leftPageCount) setLeftPage(leftPageCount);
  }, [leftPage, leftPageCount]);

  const handleSelectCategory = async (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    await loadSchema(categoryId);
  };

  const handleAssign = async (attrDefId: number) => {
    if (!selectedCategoryId) return;
    setSubmitting(true);
    setError('');

    try {
      await categoryAttributeApi.assign(
        selectedCategoryId,
        attrDefId,
        newIsRequired,
        Number(newDisplayOrder) || 0,
        newGroupId ? Number(newGroupId) : undefined,
      );

      // Reload schema sau khi assign thành công
      await loadSchema(selectedCategoryId);
      
      // Reset form sau khi assign
      setNewIsRequired(false);
      setNewDisplayOrder('0');
      setNewGroupId('');
    } catch (err: unknown) {
      setError(getApiMessage(err, 'Không thể gán thuộc tính vào danh mục'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRequired = async (item: CategoryAttributeSchemaItem) => {
    if (!schema) return;

    setError('');
    const oldSchema = schema;

    // Optimistic update: toggle required trước và update UI ngay
    const newSchema: CategoryAttributeSchema = {
      ...oldSchema,
      groups: oldSchema.groups.map((group) => ({
        ...group,
        items: group.items.map((i) =>
          i.categoryAttributeId === item.categoryAttributeId
            ? { ...i, isRequired: !i.isRequired }
            : i,
        ),
      })),
    };
    setSchema(newSchema);

    try {
      await categoryAttributeApi.update(item.categoryAttributeId, {
        isRequired: !item.isRequired,
      });
    } catch (err: unknown) {
      setError(getApiMessage(err, 'Cập nhật bắt buộc thất bại'));
      // Revert schema nếu API fail
      setSchema(oldSchema);
    }
  };

  const handleUpdateOrder = async (itemId: number, displayOrder: number) => {
    if (!schema) return;

    setError('');
    const oldSchema = schema;

    // Optimistic update: cập nhật order trước và update UI ngay
    const newSchema: CategoryAttributeSchema = {
      ...oldSchema,
      groups: oldSchema.groups.map((group) => ({
        ...group,
        items: group.items.map((i) =>
          i.categoryAttributeId === itemId
            ? { ...i, displayOrder }
            : i,
        ),
      })),
    };
    setSchema(newSchema);

    try {
      await categoryAttributeApi.update(itemId, { displayOrder });
    } catch (err: unknown) {
      setError(getApiMessage(err, 'Cập nhật thứ tự hiển thị thất bại'));
      // Revert schema nếu API fail
      setSchema(oldSchema);
    }
  };

  const handleMoveGroup = async (itemId: number, groupId: number) => {
    if (!schema) return;

    setError('');
    const oldSchema = schema;

    // Optimistic update: di chuyển item sang nhóm mới ngay
    const newSchema: CategoryAttributeSchema = {
      ...oldSchema,
      groups: oldSchema.groups.map((group) => {
        // Loại bỏ item khỏi nhóm cũ
        const itemsFiltered = group.items.filter((i) => i.categoryAttributeId !== itemId);
        // Nếu nhóm mới có groupId = groupId thì thêm item vào
        if (group.groupId === groupId) {
          const itemToMove = oldSchema.groups.flatMap((g) => g.items).find((i) => i.categoryAttributeId === itemId);
          if (itemToMove) {
            return {
              ...group,
              items: [...itemsFiltered, { ...itemToMove }],
            };
          }
        }
        return { ...group, items: itemsFiltered };
      }),
    };
    setSchema(newSchema);

    try {
      await categoryAttributeApi.update(itemId, { groupId });
    } catch (err: unknown) {
      setError(getApiMessage(err, 'Chuyển nhóm thất bại'));
      // Revert schema nếu API fail
      setSchema(oldSchema);
    }
  };

  const handleRemove = async (itemId: number) => {
    if (!confirm('Xóa liên kết thuộc tính này khỏi danh mục?')) return;

    if (!schema) return;

    setError('');
    const oldSchema = schema;

    // Optimistic update: xóa item khỏi schema ngay
    const newSchema: CategoryAttributeSchema = {
      ...oldSchema,
      groups: oldSchema.groups.map((group) => ({
        ...group,
        items: group.items.filter((i) => i.categoryAttributeId !== itemId),
      })),
    };
    setSchema(newSchema);

    try {
      await categoryAttributeApi.removeById(itemId);
    } catch (err: unknown) {
      setError(getApiMessage(err, 'Xóa liên kết thất bại'));
      // Revert schema nếu API fail
      setSchema(oldSchema);
    }
  };

  const renderSchemaGroup = (group: CategoryAttributeSchemaGroup) => {
    const isUngrouped = group.groupId === null;

    return (
      <div key={String(group.groupId)} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{group.groupName}</h3>
            <p className="text-xs text-slate-500">Order nhóm: {group.groupDisplayOrder}</p>
          </div>
          <span className="text-xs font-medium text-slate-500">{group.items.length} thuộc tính</span>
        </div>

        {group.items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-400">Không có thuộc tính nào</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {group.items.map((item) => (
              <div key={item.categoryAttributeId} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.attrName}</p>
                    <p className="text-xs text-slate-500">{item.attrKey}</p>
                  </div>

                  <button
                    onClick={() => handleRemove(item.categoryAttributeId)}
                    className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 size={13} /> Xóa
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={item.isRequired}
                      onChange={() => void handleToggleRequired(item)}
                    />
                    Bắt buộc
                  </label>

                  <label className="text-sm text-slate-700 flex items-center gap-2">
                    <span className="shrink-0">Thứ tự</span>
                    <input
                      type="number"
                      defaultValue={item.displayOrder}
                      onBlur={(e) => {
                        const nextValue = Number(e.target.value);
                        if (Number.isNaN(nextValue) || nextValue === item.displayOrder) return;
                        void handleUpdateOrder(item.categoryAttributeId, nextValue);
                      }}
                      className="w-24 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                    />
                  </label>

                  <label className="text-sm text-slate-700 flex items-center gap-2">
                    <span className="shrink-0">Nhóm</span>
                    <select
                      defaultValue={group.groupId?.toString() ?? ''}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const nextGroupId = Number(e.target.value);
                        if (!isUngrouped && nextGroupId === group.groupId) return;
                        void handleMoveGroup(item.categoryAttributeId, nextGroupId);
                      }}
                      className="min-w-40 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                      title={
                        isUngrouped
                          ? 'API hiện tại chưa hỗ trợ clear group trực tiếp từ FE'
                          : 'Chuyển thuộc tính sang nhóm khác'
                      }
                    >
                      {isUngrouped && <option value="">Chọn nhóm đích</option>}
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {isUngrouped && (
                  <p className="text-xs text-amber-600">
                    API hiện tại chưa hỗ trợ thao tác clear-group explicit, nên chỉ có thể chuyển mục này vào một nhóm cụ thể.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Category Attribute Schema</h1>
        <p className="text-sm text-slate-500 mt-1">
          Quản lý thuộc tính theo danh mục, nhóm, bắt buộc và thứ tự hiển thị
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {loadingInit ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                <FolderTree size={14} className="text-slate-400" /> Danh mục
              </h3>

              <ul className="space-y-1 max-h-[28rem] overflow-y-auto">
                {sortedCategories.map(({ cat, depth }) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => void handleSelectCategory(cat.id)}
                      style={{ paddingLeft: `${12 + depth * 14}px` }}
                      className={`w-full text-left py-2 pr-3 rounded-xl text-sm transition-colors ${
                        selectedCategoryId === cat.id
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="xl:col-span-9 space-y-4">
            {!selectedCategoryId ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-sm text-slate-400">
                Chọn danh mục để bắt đầu
              </div>
            ) : loadingSchema ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 2xl:grid-cols-5 gap-4">
                  <div className="2xl:col-span-2 bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Kho thuộc tính chưa gán</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Chặn gán trùng ở FE, backend vẫn tiếp tục validate
                      </p>
                    </div>

                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm theo tên hoặc key"
                        className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <label className="col-span-1 text-xs text-slate-600">
                        <span className="block mb-1">Required</span>
                        <input
                          type="checkbox"
                          checked={newIsRequired}
                          onChange={(e) => setNewIsRequired(e.target.checked)}
                        />
                      </label>

                      <label className="col-span-1 text-xs text-slate-600">
                        <span className="block mb-1">Order</span>
                        <input
                          type="number"
                          value={newDisplayOrder}
                          onChange={(e) => setNewDisplayOrder(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm"
                        />
                      </label>

                      <label className="col-span-1 text-xs text-slate-600">
                        <span className="block mb-1">Nhóm</span>
                        <select
                          value={newGroupId}
                          onChange={(e) => setNewGroupId(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm"
                        >
                          <option value="">Chưa phân nhóm</option>
                          {groups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="space-y-2 min-h-16">
                      {pagedDefs.length === 0 ? (
                        <p className="text-sm text-slate-400 py-3 text-center">Không còn thuộc tính phù hợp</p>
                      ) : (
                        pagedDefs.map((attr) => (
                          <div
                            key={attr.id}
                            className="border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{attr.name}</p>
                              <p className="text-xs text-slate-500 truncate">{attr.attrKey}</p>
                            </div>
                            <button
                              onClick={() => void handleAssign(attr.id)}
                              disabled={submitting}
                              className="inline-flex items-center gap-1 text-xs bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                              <Plus size={13} /> Gán
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <Pagination
                      page={leftPage}
                      pageCount={leftPageCount}
                      total={filteredDefs.length}
                      pageSize={LEFT_PAGE_SIZE}
                      onChange={setLeftPage}
                    />
                  </div>

                  <div className="2xl:col-span-3 space-y-3">
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">Grouped Schema</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Dữ liệu render từ endpoint schema sau mỗi mutation
                        </p>
                      </div>
                      <ArrowRightLeft size={16} className="text-slate-400" />
                    </div>

                    {(schema?.groups ?? [])
                      .slice()
                      .sort((a, b) => a.groupDisplayOrder - b.groupDisplayOrder)
                      .map((group) => renderSchemaGroup(group))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
