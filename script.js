        // Configurações globais
        const FIREBASE_URL = 'https://bdpessoal-4b5b8-default-rtdb.firebaseio.com';
        const IMGBB_API_KEY = 'a294f1de7d16060052c86c7ff6bf37be';
        const PRODUCTS_API_URL = `${FIREBASE_URL}/Produtos`;
        const COLLECTIONS = ['P_produtos', 'depoimentos', 'P_carrossel', 'Vantagens'];
        
        // Variáveis globais
        let allProducts = [];
        let currentUser = null;
        let categoryChart = null;
        let priceDistributionChart = null;
        const itemsPerPage = 10;

        // Função para escapar caracteres HTML (segurança)
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function setSubmitButtonLoading(isLoading) {
    const submitBtn = document.getElementById('p-produtos-submit');
    const submitText = document.getElementById('submit-text');
    const submitLoading = document.getElementById('submit-loading');
    
    if (!submitBtn || !submitText || !submitLoading) {
        console.error('Elementos do botão submit não encontrados');
        return;
    }
    
    if (isLoading) {
        submitBtn.disabled = true;
        submitText.classList.add('hidden');
        submitLoading.classList.remove('hidden');
        submitBtn.classList.remove('hover:bg-blue-700');
        submitBtn.classList.add('bg-blue-400', 'cursor-not-allowed');
    } else {
        submitBtn.disabled = false;
        submitText.classList.remove('hidden');
        submitLoading.classList.add('hidden');
        submitBtn.classList.add('hover:bg-blue-700');
        submitBtn.classList.remove('bg-blue-400', 'cursor-not-allowed');
    }
}

// Função global para confirmar exclusão
window.showDeleteItemConfirmation = function(collection, id, name) {
    showConfirmModal(
        `Excluir "${escapeHtml(name)}"`,
        `Tem certeza que deseja excluir permanentemente este item?`,
        async () => {
            try {
                setSubmitButtonLoading(true);
                await deleteCollectionItem(collection, id);
                showSuccess('Item excluído com sucesso!');
            } catch (error) {
                showError('Erro ao excluir: ' + error.message);
            } finally {
                setSubmitButtonLoading(false);
            }
        }
    );
};

// Função global para edição
window.editItem = function(collection, id) {
    const item = collectionsData[collection].items.find(item => item.id === id);
    if (!item) return;

    const form = document.getElementById(`${collection.toLowerCase()}Form`);
    if (!form) return;

    // Preencher os campos do formulário
    form.querySelector('[name="Nome"]').value = item.Nome || '';
    form.querySelector('[name="PrecoAntigo"]').value = item.PrecoAntigo || 0;
    form.querySelector('[name="PrecoNovo"]').value = item.PrecoNovo || 0;
    document.getElementById(`${collection.toLowerCase()}-id`).value = item.id;

    // Preencher imagem se existir
    if (item.Imagem) {
        const previewImg = document.getElementById(`${collection.toLowerCase()}-imagem-preview`);
        const placeholderImg = document.getElementById(`${collection.toLowerCase()}-imagem-placeholder`);
        if (previewImg && placeholderImg) {
            previewImg.src = item.Imagem;
            previewImg.classList.remove('hidden');
            placeholderImg.classList.add('hidden');
            document.getElementById(`${collection.toLowerCase()}-imagem-url`).value = item.Imagem;
        }
    }

    // Atualizar estado
    collectionsData[collection].editingId = item.id;
    form.scrollIntoView({ behavior: 'smooth' });
};
        
        // Objeto para gerenciar todas as coleções
        const collectionsData = {
            P_produtos: { 
                items: [], 
                currentPage: 1, 
                editingId: null,
                searchQuery: ''
            },
            depoimentos: { 
                items: [], 
                currentPage: 1, 
                editingId: null,
                searchQuery: ''
            },
            P_carrossel: { 
                items: [], 
                currentPage: 1, 
                editingId: null,
                searchQuery: ''
            },
            Vantagens: { 
                items: [], 
                currentPage: 1, 
                editingId: null,
                searchQuery: ''
            }
        };

        
        // Inicialização quando o DOM estiver pronto
        document.addEventListener('DOMContentLoaded', function() {
            initializeApp();
            setupEventListeners();
            checkAuth();
                            if (!userData || !userData.loggedIn) {
        // Redirecionar para a página de login se não estiver autenticado
        window.location.href = 'index.html';
        return;}
        });
        
        // Função para inicializar a aplicação
        function initializeApp() {
            // Verificar autenticação
            const userData = JSON.parse(localStorage.getItem('userData'));
            if (userData && userData.loggedIn) {
                currentUser = userData;
                updateUserInfo();
            }
            
            // Inicializar charts
            initializeCharts();
            
            // Carregar tema
            loadTheme();
            
            // Mostrar dashboard por padrão
            document.querySelector('[data-tab="dashboard"]').click();
        }
        
        // Carregar tema do localStorage
        function loadTheme() {
            const theme = localStorage.getItem('theme') || 'light';
            document.documentElement.classList.toggle('dark', theme === 'dark');
        }
        
        // Configurar listeners de eventos
        function setupEventListeners() {
            // Sidebar
            document.getElementById('mobileToggleSidebar').addEventListener('click', toggleSidebarMobile);
            document.getElementById('sidebarOverlay').addEventListener('click', toggleSidebarMobile);
            document.getElementById('toggleSidebar').addEventListener('click', toggleSidebarDesktop);

            document.getElementById('refresh-p-produtos').addEventListener('click', async function() {
            try {
                setSubmitButtonLoading(true); // Usar a mesma função de loading
                await loadItems('P_produtos');
                showSuccess('Lista de produtos atualizada com sucesso!');
            } catch (error) {
                showError('Erro ao atualizar: ' + error.message);
            } finally {
                setSubmitButtonLoading(false);
            }
        });
        // Adicione isso na função setupEventListeners()
        document.getElementById('refresh-p-carrossel').addEventListener('click', async function() {
            try {
                setSubmitButtonLoading(true);
                await loadItems('P_carrossel');
                showSuccess('Carrossel atualizado com sucesso!');
            } catch (error) {
                showError('Erro ao atualizar carrossel: ' + error.message);
            } finally {
                setSubmitButtonLoading(false);
            }
        });

        // Adicione o listener para o formulário do carrossel
        document.getElementById('p-carrosselForm')?.addEventListener('submit', function(e) {
            e.preventDefault();
            handleCollectionSubmit(e, 'P_carrossel');
        });

        // Adicione o listener para o upload de imagem do carrossel
        const pCarrosselImageInput = document.getElementById('p-carrossel-imagem');
        if (pCarrosselImageInput) {
            pCarrosselImageInput.addEventListener('change', (e) => handleImageUpload(e, 'P_carrossel'));
        }
        
        
            // Logout
            document.getElementById('logout-btn').addEventListener('click', logout);
            
            // Formulário de produtos
            document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);
            
            // Modal
            document.getElementById('closeProductModal').addEventListener('click', () => {
                hideModal('productModal');
            });
            document.getElementById('modal-close-btn').addEventListener('click', () => {
                hideModal('productModal');
            });

                // Listeners específicos para P_carrossel
    document.getElementById('refresh-p-carrossel')?.addEventListener('click', async () => {
        try {
            await loadP_carrossel();
            showSuccess('Carrossel atualizado com sucesso!');
        } catch (error) {
            showError('Erro ao atualizar carrossel');
        }
    });
    
        // No seu setupEventListeners, substitua por:
    document.getElementById('p-carrosselForm')?.addEventListener('submit', handleP_carrosselSubmit);
        
    document.getElementById('p-carrossel-imagem')?.addEventListener('change', (e) => {
        handleImageUpload(e, 'P_carrossel');
    });
    
    document.getElementById('p-carrossel-cancel')?.addEventListener('click', () => {
        resetForm('p-carrosselForm');
        collectionsData.P_carrossel.editingId = null;
    });
    
    document.getElementById('p-carrossel-search')?.addEventListener('input', (e) => {
        collectionsData.P_carrossel.searchQuery = e.target.value.toLowerCase();
        collectionsData.P_carrossel.currentPage = 1;
        renderP_carrosselItems();
    });
    
    document.getElementById('prev-p-carrossel')?.addEventListener('click', () => {
        changePage(-1, 'P_carrossel');
    });
    
    document.getElementById('next-p-carrossel')?.addEventListener('click', () => {
        changePage(1, 'P_carrossel');
    });
            
            
            document.getElementById('p-produtosForm').addEventListener('submit', function(e) {
                const submitBtn = document.getElementById('p-produtos-submit');
                
                // Verificar se já está processando
                if (submitBtn.disabled) {
                    e.preventDefault();
                    return;
                }
                
                handleCollectionSubmit(e, 'P_produtos');
            });
            // Confirmation modal
            document.getElementById('confirmModalCancel').addEventListener('click', () => {
                hideModal('confirmModal');
            });
            
            // Notifications
            document.querySelectorAll('[data-dismiss-target]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const target = btn.getAttribute('data-dismiss-target');
                    document.querySelector(target).classList.add('hidden');
                });
            });
            

            // Navegação por tabs
            document.querySelectorAll('[data-tab]').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const tabId = this.getAttribute('data-tab');
                    console.log(`Clicou na aba: ${tabId}`);
                    navigateToTab(tabId);
                    
                    // Carregamento específico para P_produtos
                    if (tabId === 'p-produtos') {
                        console.log('Iniciando carregamento de P_produtos...');
                        loadItems('P_produtos').then(() => {
                            console.log('P_produtos carregados com sucesso');
                        }).catch(error => {
                            console.error('Erro ao carregar P_produtos:', error);
                        });
                    }
                });
            });


            
            // Configurar listeners para cada coleção
            COLLECTIONS.forEach(collection => {
                // Formulários
                const form = document.getElementById(`${collection.toLowerCase()}Form`);
                if (form) {
                    form.addEventListener('submit', (e) => handleCollectionSubmit(e, collection));
                }
                
                // Listeners para upload de imagens
                const imageInput = document.getElementById(`${collection.toLowerCase()}-imagem`);
                if (imageInput) {
                    imageInput.addEventListener('change', (e) => handleImageUpload(e, collection));
                }
                // Upload de imagem para P_produtos
                const pProdutosImageInput = document.getElementById('p-produtos-imagem');
                if (pProdutosImageInput) {
                    pProdutosImageInput.addEventListener('change', (e) => handleImageUpload(e, 'P_produtos'));
                }

                
                // Botões de paginação
                const prevBtn = document.getElementById(`prev-${collection.toLowerCase()}`);
                const nextBtn = document.getElementById(`next-${collection.toLowerCase()}`);
                
                if (prevBtn) prevBtn.addEventListener('click', () => changePage(-1, collection));
                if (nextBtn) nextBtn.addEventListener('click', () => changePage(1, collection));
                
                // Busca
                const searchInput = document.getElementById(`${collection.toLowerCase()}-search`);
                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        collectionsData[collection].searchQuery = e.target.value.toLowerCase();
                        collectionsData[collection].currentPage = 1;
                        renderItems(collection);
                    });
                }
                
                // Cancelar edição
                const cancelBtn = document.getElementById(`${collection.toLowerCase()}-cancel`);
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        resetForm(`${collection.toLowerCase()}Form`);
                        collectionsData[collection].editingId = null;
                    });
                }
            });
            
            // Search for products
            document.getElementById('product-search')?.addEventListener('input', function(e) {
                updateProductsList(1, e.target.value.toLowerCase());
            });
            
            // Botões de refresh
            document.getElementById('refresh-chart')?.addEventListener('click', updateCharts);
            document.getElementById('refresh-price-chart')?.addEventListener('click', updateCharts);
            document.getElementById('refresh-products')?.addEventListener('click', () => {
                loadProducts().then(() => {
                    showSuccess('Produtos atualizados com sucesso!');
                });
            });
            
            COLLECTIONS.forEach(collection => {
                const button = document.getElementById(`refresh-${collection.toLowerCase()}`);
                if (button) {
                    button.addEventListener('click', () => {
                        loadItems(collection).then(() => {
                            showSuccess(`${collection} atualizada com sucesso!`);
                        });
                    });
                }
            });
            
            // Event listeners para modais
            document.getElementById('delete-product-btn')?.addEventListener('click', function() {
                const productName = document.getElementById('modal-product-name').textContent;
                const productId = this.dataset.productId;
                
                showConfirmModal(
                    `Excluir ${productName}`,
                    `Tem certeza que deseja excluir "${productName}" permanentemente? Esta ação não pode ser desfeita.`,
                    () => {
                        deleteProduct(productId).then(success => {
                            if (success) {
                                hideModal('productModal');
                            }
                        });
                    }
                );
            });
            
            // Redimensionamento da janela
            window.addEventListener('resize', handleWindowResize);
        }
        
        // Verificar autenticação
        function checkAuth() {
            if (!currentUser) {
                window.location.href = 'index.html';
                return;
            }
            
            // Carregar dados iniciais
            loadInitialData();
        }
        
        // Atualizar informações do usuário na UI
        function updateUserInfo() {
            if (!currentUser) return;
            
            document.getElementById('user-name').textContent = currentUser.name;
            document.getElementById('user-email').textContent = currentUser.email;
            document.getElementById('header-user-name').textContent = currentUser.name;
        }
        
        // Carregar dados iniciais
        async function loadInitialData() {
            try {
                await loadProducts();
                await Promise.all(COLLECTIONS.map(collection => loadItems(collection)));
            } catch (error) {
                console.error('Erro ao carregar dados iniciais:', error);
                showError('Erro ao carregar dados. Por favor, recarregue a página.');
            }
        }
        
        // ======================
        // GERENCIAMENTO DE PRODUTOS
        // ======================
        
        // Carregar produtos
        async function loadProducts() {
            try {
                showLoading('products-list', 'Carregando produtos...');
                showLoading('recent-products', 'Carregando produtos recentes...');
                
                const response = await fetch(`${PRODUCTS_API_URL}.json`);
                if (!response.ok) throw new Error('Falha ao carregar produtos');
                
                const data = await response.json();
                allProducts = data ? Object.entries(data).map(([key, value]) => ({
                    firebaseId: key,
                    id: parseInt(value.ID) || Date.now(),
                    name: value.Nome || 'Sem nome',
                    category: (value.Categoria?.toLowerCase() || 'geral').trim(),
                    price: parseFloat(value.Preço) || 0,
                    image: value.Imagem || 'https://via.placeholder.com/300x400?text=Produto+sem+imagem',
                    description: value.Descrição || 'Descrição não disponível',
                    createdAt: value.createdAt || Date.now()
                })) : [];
                
                updateDashboard();
                updateProductsList();
                updateRecentProducts();
                updateCharts();
                
                return allProducts;
            } catch (error) {
                console.error('Erro ao carregar produtos:', error);
                showError('Erro ao carregar produtos. Tente novamente.');
                throw error;
            }
        }
        
        // Adicionar/Editar produto
        async function handleProductSubmit(e) {
            e.preventDefault();
            
            const form = e.target;
            const fileInput = form.querySelector('input[type="file"]');
            const file = fileInput?.files[0];
            
            try {
                // Validar campos obrigatórios
                if (!validateForm(form)) {
                    showError('Preencha todos os campos obrigatórios');
                    return;
                }
                
                // Upload da imagem se existir
                let imageUrl = form.querySelector('[name="ImagemUrl"]')?.value;
                if (file && !imageUrl) {
                    showLoading('recent-products', 'Enviando imagem...');
                    imageUrl = await uploadImage(file);
                }
                
                // Criar objeto do produto
                const product = {
                    ID: form.productId?.value || generateUniqueId(),
                    Nome: form.querySelector('[name="Nome"]').value,
                    Categoria: form.querySelector('[name="Categoria"]').value,
                    Preço: parseFloat(form.querySelector('[name="Preco"]').value),
                    Descrição: form.querySelector('[name="Descricao"]').value,
                    Imagem: imageUrl || 'https://via.placeholder.com/300x400?text=Produto+sem+imagem',
                    createdAt: Date.now()
                };
                
                // Adicionar ou atualizar produto
                const isEdit = !!form.productId?.value;
                showLoading('recent-products', isEdit ? 'Atualizando produto...' : 'Adicionando produto...');
                
                const success = isEdit 
                    ? await updateProduct(form.productId.value, product)
                    : await addProduct(product);
                
                if (success) {
                    form.reset();
                    showSuccess(`Produto ${isEdit ? 'atualizado' : 'adicionado'} com sucesso!`);
                    document.querySelector('[data-tab="dashboard"]').click();
                }
            } catch (error) {
                console.error('Erro ao processar produto:', error);
                showError(`Erro ao ${form.productId?.value ? 'atualizar' : 'adicionar'} produto: ${error.message}`);
            }
        }
        
        // Adicionar produto
        async function addProduct(product) {
            try {
                const response = await fetch(`${PRODUCTS_API_URL}/${product.ID}.json`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(product)
                });
                
                if (!response.ok) throw new Error('Falha ao adicionar produto');
                
                await loadProducts();
                return true;
            } catch (error) {
                console.error('Erro ao adicionar produto:', error);
                throw error;
            }
        }
        
        // Atualizar produto
        async function updateProduct(id, updates) {
            try {
                const existingProduct = allProducts.find(p => p.id === parseInt(id));
                if (!existingProduct) throw new Error('Produto não encontrado');
                
                const response = await fetch(`${PRODUCTS_API_URL}/${existingProduct.firebaseId}.json`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...updates,
                        ID: existingProduct.id // Garantir que o ID não mude
                    })
                });
                
                if (!response.ok) throw new Error('Falha ao atualizar produto');
                
                await loadProducts();
                return true;
            } catch (error) {
                console.error('Erro ao atualizar produto:', error);
                throw error;
            }
        }
        
        // Excluir produto
        async function deleteProduct(id) {
            try {
                const product = allProducts.find(p => p.id === id);
                if (!product || !product.firebaseId) {
                    throw new Error('Produto não encontrado');
                }
                
                const response = await fetch(`${PRODUCTS_API_URL}/${product.firebaseId}.json`, {
                    method: "DELETE"
                });
                
                if (!response.ok) throw new Error('Falha ao excluir produto');
                
                await loadProducts();
                showSuccess('Produto excluído com sucesso!');
                return true;
            } catch (error) {
                console.error('Erro ao excluir produto:', error);
                showError(`Erro ao excluir produto: ${error.message}`);
                return false;
            }
        }
        
        // ======================
        // GERENCIAMENTO DE COLEÇÕES (P_produtos, depoimentos, etc.)
        // ======================
        
        // Carregar itens de uma coleção
function getListElementId(collection) {
    if (collection === 'P_produtos') return 'p-produtos-list';
    if (collection === 'P_carrossel') return 'p-carrossel-list';
    if (collection === 'depoimentos') return 'depoimentos-list';
    if (collection === 'Vantagens') return 'vantagens-list';
    return `${collection.toLowerCase().replace(/_/g, '-')}-list`; // padrão seguro
}



async function loadItems(collection) {
    try {
        console.log(`[${collection}] Iniciando carregamento...`);
        
        // Corrigindo o ID do elemento para P_produtos
        const listElementId = getListElementId(collection);

        
        const listElement = document.getElementById(listElementId);
        
        if (!listElement) {
            console.error(`[${collection}] Elemento com ID ${listElementId} não encontrado no DOM`);
            return;
        }

        // Mostrar estado de carregamento
        listElement.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-400">
                    <i class="fas fa-spinner spinner text-xl mr-2"></i>
                    Carregando ${collection}...
                </td>
            </tr>
        `;

        console.log(`[${collection}] Fazendo requisição para: ${FIREBASE_URL}/${collection}.json`);
        const response = await fetch(`${FIREBASE_URL}/${collection}.json`);
        
        console.log(`[${collection}] Resposta recebida:`, response);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[${collection}] Dados recebidos:`, data);

        // Processar os itens
        const items = data ? Object.entries(data).map(([key, value]) => ({
            id: key,
            ...value
        })) : [];

        console.log(`[${collection}] Itens processados:`, items);
        
        // Atualizar dados da coleção
        collectionsData[collection].items = items;
        collectionsData[collection].currentPage = 1;

        // Renderizar os itens
        renderItems(collection);
        console.log(`[${collection}] Renderização concluída`);

        return items;
    } catch (error) {
        console.error(`[${collection}] Erro no loadItems:`, error);
        
        const listElementId = collection === 'P_produtos' ? 'p-produtos-list' : `${collection.toLowerCase()}-list`;
        const errorElement = document.getElementById(listElementId);
        
        if (errorElement) {
            errorElement.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-red-500">
                        <i class="fas fa-exclamation-circle mr-2"></i>
                        Erro ao carregar: ${error.message}
                    </td>
                </tr>
            `;
        }
        
        showError(`Erro ao carregar ${collection}: ${error.message}`);
        throw error;
    }
}
        
        // Manipular envio de formulário de coleção
async function handleCollectionSubmit(e, collection) {
    e.preventDefault();
    setSubmitButtonLoading(true);
    
    const form = e.target;
    const formData = new FormData(form);
    
    try {
        // Construir objeto com os dados
        let itemData;
        
        if (collection === 'P_carrossel') {
            itemData = {
                Titulo: formData.get('Titulo'),
                Descricao: formData.get('Descricao'),
                Imagem: formData.get('Imagem') || ''
            };
        } else {
            itemData = {
                Nome: formData.get('Nome'),
                PrecoAntigo: parseFloat(formData.get('PrecoAntigo')) || 0,
                PrecoNovo: parseFloat(formData.get('PrecoNovo')) || 0,
                Imagem: formData.get('Imagem') || ''
            };
        }

        // Processar upload de imagem se existir
        const imageInput = form.querySelector('input[type="file"]');
        if (imageInput?.files[0]) {
            itemData.Imagem = await handleImageUpload({ target: imageInput }, collection);
        }

        const itemId = formData.get('id');
        const isEdit = !!itemId;

        if (isEdit) {
            await updateCollectionItem(collection, itemId, itemData);
            showSuccess('Item atualizado com sucesso!');
        } else {
            await addCollectionItem(collection, itemData);
            showSuccess('Item adicionado com sucesso!');
        }

        await loadItems(collection);
        resetForm(form);
        collectionsData[collection].editingId = null;

    } catch (error) {
        console.error('Erro ao salvar:', error);
        showError(`Erro ao salvar: ${error.message}`);
    } finally {
        setSubmitButtonLoading(false);
    }
}
        
async function addCollectionItem(collection, item) {
    try {
        const response = await fetch(`${FIREBASE_URL}/${collection}.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });

        if (!response.ok) throw new Error('Falha ao adicionar');
        return await response.json();
    } catch (error) {
        console.error(`Erro ao adicionar ${collection}:`, error);
        throw error;
    }
}

async function updateCollectionItem(collection, id, updates) {
    try {
        const response = await fetch(`${FIREBASE_URL}/${collection}/${id}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!response.ok) throw new Error('Falha na atualização');
        return await response.json();
    } catch (error) {
        console.error(`Erro ao atualizar ${collection}:`, error);
        throw error;
    }
}

async function deleteCollectionItem(collection, id) {
    try {
        const response = await fetch(`${FIREBASE_URL}/${collection}/${id}.json`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Falha na exclusão');
        
        // Atualizar lista local
        collectionsData[collection].items = collectionsData[collection].items.filter(item => item.id !== id);
        renderItems(collection);
        
        return true;
    } catch (error) {
        console.error(`Erro ao excluir ${collection}:`, error);
        throw error;
    }
}
        
        // ======================
        // FUNÇÕES DE INTERFACE
        // ======================
        
        // Atualizar dashboard
        function updateDashboard() {
            // Total de produtos
            document.getElementById('total-products').textContent = allProducts.length.toLocaleString();
            
            // Total de categorias únicas
            const uniqueCategories = [...new Set(allProducts.map(p => p.category))];
            document.getElementById('total-categories').textContent = uniqueCategories.length.toLocaleString();
            
            // Preço médio
            const averagePrice = allProducts.length > 0 ? 
                (allProducts.reduce((sum, p) => sum + p.price, 0) / allProducts.length).toFixed(2) : 0;
            document.getElementById('average-price').textContent = `R$ ${averagePrice}`;
        }
        
        // Atualizar lista de produtos
        function updateProductsList(page = 1, searchQuery = '') {
            const container = document.getElementById('products-list');
            if (!container) return;
            
            let filteredProducts = [...allProducts];
            
            // Aplicar filtro de busca se existir
            if (searchQuery) {
                filteredProducts = filteredProducts.filter(product => 
                    product.name.toLowerCase().includes(searchQuery) || 
                    product.category.toLowerCase().includes(searchQuery) ||
                    product.description.toLowerCase().includes(searchQuery)
                );
            }
            
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, filteredProducts.length);
            const productsToShow = filteredProducts.slice(startIndex, endIndex);
            
            if (productsToShow.length === 0) {
                container.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                            Nenhum produto encontrado
                        </td>
                    </tr>
                `;
                
                // Atualizar controles de paginação
                updatePagination('products', page, 0);
                return;
            }
            
            container.innerHTML = productsToShow.map(product => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex-shrink-0 h-10 w-10">
                            <img src="${product.image}" alt="${product.name}" class="h-10 w-10 rounded-lg object-cover">
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${product.name}</div>
                        <div class="text-sm text-gray-500 truncate max-w-xs">${product.description}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                            ${product.category}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        R$ ${product.price.toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="viewProduct(${product.id})" class="text-blue-600 hover:text-blue-900 mr-4">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editProduct(${product.id})" class="text-yellow-600 hover:text-yellow-900 mr-4">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="showDeleteProductConfirmation(${product.id}, '${product.name.replace(/'/g, "\\'")}')" class="text-red-600 hover:text-red-900">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
            
            // Atualizar controles de paginação
            updatePagination('products', page, filteredProducts.length);
        }
        
        // Atualizar produtos recentes
        function updateRecentProducts() {
            const container = document.getElementById('recent-products');
            if (!container) return;
            
            // Ordenar por data de criação (mais recentes primeiro) e pegar os 6 primeiros
            const recentProducts = [...allProducts]
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 6);
            
            if (recentProducts.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full py-10 text-center text-gray-500">
                        Nenhum produto recente
                    </div>
                `;
                return;
            }
            
            container.innerHTML = recentProducts.map(product => `
                <div class="bg-white rounded-xl card-shadow overflow-hidden hover:shadow-md transition-shadow">
                    <div class="h-48 bg-gray-100 flex items-center justify-center p-4">
                        <img src="${product.image}" alt="${product.name}" class="h-full w-full object-contain hover:scale-105 transition-transform duration-200">
                    </div>
                    <div class="p-4">
                        <h3 class="text-lg font-semibold text-gray-800 truncate mb-1">${product.name}</h3>
                        <div class="flex items-center justify-between mt-2">
                            <span class="text-xs text-gray-500 capitalize">${product.category}</span>
                            <span class="text-md font-bold text-blue-600">R$ ${product.price.toFixed(2)}</span>
                        </div>
                        <button onclick="viewProduct(${product.id})" class="btn-hover w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm">
                            Ver Detalhes
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        // Renderizar itens de uma coleção

        function getListElementId(collection) {
    return collection.toLowerCase().replace(/_/g, '-') + '-list';
}

function renderItems(collection) {
    const containerId = getListElementId(collection);

    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error(`Container com ID ${containerId} não encontrado`);
        return;
    }

    const { items, currentPage, searchQuery } = collectionsData[collection];
    let filteredItems = [...items];
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredItems = filteredItems.filter(item => {
            return (
                (item.Nome && item.Nome.toLowerCase().includes(query)) ||
                (item.PrecoAntigo && item.PrecoAntigo.toString().includes(query)) ||
                (item.PrecoNovo && item.PrecoNovo.toString().includes(query))
            );
        });
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
    const itemsToShow = filteredItems.slice(startIndex, endIndex);

    // Limpar o container
    container.innerHTML = '';

    if (itemsToShow.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    Nenhum item encontrado
                </td>
            </tr>
        `;
    } else if (collection === 'P_produtos') {
        itemsToShow.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <img src="${item.Imagem || 'https://via.placeholder.com/300x400?text=Sem+imagem'}"
                         class="h-10 w-10 rounded-lg object-cover">
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(item.Nome || 'Sem nome')}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 line-through">
                    R$ ${parseFloat(item.PrecoAntigo || 0).toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    R$ ${parseFloat(item.PrecoNovo || 0).toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button data-action="edit" data-id="${item.id}" class="text-yellow-600 hover:text-yellow-900 mr-4">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button data-action="delete" data-id="${item.id}" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            container.appendChild(row);
        });

    } else if (collection === 'P_carrossel') {
        itemsToShow.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <img src="${item.Imagem || 'https://via.placeholder.com/300x400?text=Sem+imagem'}"
                         class="h-10 w-10 rounded-lg object-cover">
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(item.Titulo || 'Sem título')}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${escapeHtml(item.Descricao || 'Sem descrição')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="editItem('P_carrossel', '${item.id}')" class="text-yellow-600 hover:text-yellow-900 mr-4">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="showDeleteItemConfirmation('P_carrossel', '${item.id}', '${escapeHtml(item.Titulo || 'item')}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            container.appendChild(row);
            updatePagination('p-carrossel', currentPage, filteredItems.length);
        });
    }

    // Configurar event delegation para os botões
    container.addEventListener('click', function(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const item = collectionsData[collection].items.find(item => item.id === id);

        try {
            if (action === 'edit' && window.editItem) {
                window.editItem(collection, id);
            } else if (action === 'delete' && window.showDeleteItemConfirmation) {
                window.showDeleteItemConfirmation(collection, id, item?.Nome || 'item');
            }
        } catch (error) {
            console.error('Erro ao executar ação:', error);
            showError('Erro ao processar esta ação');
        }
    });

    updatePagination(collection, currentPage, filteredItems.length);
}

// Função auxiliar para escape de HTML (adicionar no início do script)
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
        // ======================
        // FUNÇÕES UTILITÁRIAS
        // ======================
        
        // Processar upload de imagem
        async function handleImageUpload(e, collection) {
    const file = e.target.files[0];
    if (!file) return null;

    try {
        const previewImg = document.getElementById(`${collection.toLowerCase()}-imagem-preview`);
        const placeholderImg = document.getElementById(`${collection.toLowerCase()}-imagem-placeholder`);
        
        if (previewImg && placeholderImg) {
            previewImg.src = URL.createObjectURL(file);
            previewImg.classList.remove('hidden');
            placeholderImg.classList.add('hidden');
        }

        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!data.success) throw new Error('Falha no upload da imagem');

        return data.data.url;
    } catch (error) {
        console.error('Erro no upload da imagem:', error);
        showError('Erro ao enviar imagem. Tente novamente.');
        throw error;
    }
}
        
        // Upload de imagem para ImgBB
        async function uploadImage(file) {
            try {
                if (!file) throw new Error('Nenhum arquivo selecionado');
                
                const formData = new FormData();
                formData.append('image', file);
                
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                if (!data.success) throw new Error(data.error?.message || 'Falha no upload da imagem');
                
                return data.data.url;
            } catch (error) {
                console.error('Erro no upload da imagem:', error);
                throw error;
            }
        }
        
        // Mostrar loading
        function showLoading(elementId, message = 'Carregando...') {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            element.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-gray-400">
                        <i class="fas fa-spinner spinner text-xl mr-2"></i>
                        ${message}
                    </td>
                </tr>
            `;
        }
        
        // Mostrar notificação de sucesso
        function showSuccess(message) {
            const notif = document.getElementById('successNotif');
            const messageEl = document.getElementById('successNotifMessage');
            
            messageEl.textContent = message;
            notif.classList.remove('hidden');
            
            // Esconder após 5 segundos
            setTimeout(() => {
                notif.classList.add('hidden');
            }, 5000);
        }
        
        // Mostrar notificação de erro
        function showError(message) {
            const notif = document.getElementById('errorNotif');
            const messageEl = document.getElementById('errorNotifMessage');
            
            messageEl.textContent = message;
            notif.classList.remove('hidden');
            
            // Esconder após 5 segundos
            setTimeout(() => {
                notif.classList.add('hidden');
            }, 5000);
        }
        
        // Validar formulário
        function validateForm(form) {
            let isValid = true;
            
            form.querySelectorAll('[required]').forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('border-red-500', 'bg-red-50');
                } else {
                    field.classList.remove('border-red-500', 'bg-red-50');
                }
            });
            
            return isValid;
        }
        
        // Resetar formulário
        function resetForm(formId) {
            const form = typeof formId === 'string' ? document.getElementById(formId) : formId;
            if (!form) return;
            
            form.reset();
            
            // Limpar preview de imagem
            const previewImg = form.querySelector('img[id$="-preview"]');
            const placeholderImg = form.querySelector('[id$="-imagem-placeholder"]');
            if (previewImg && placeholderImg) {
                previewImg.src = '';
                previewImg.classList.add('hidden');
                placeholderImg.classList.remove('hidden');
            }
            
            // Limpar campos ocultos
            form.querySelectorAll('input[type="hidden"]').forEach(input => {
                if (input.name !== '_token') input.value = '';
            });
            
            // Remover classes de erro
            form.querySelectorAll('.border-red-500').forEach(field => {
                field.classList.remove('border-red-500', 'bg-red-50');
            });
        }
        
        // Gerar ID único
        function generateUniqueId() {
            return Date.now() + Math.floor(Math.random() * 1000);
        }
        
        // Atualizar paginação
        function updatePagination(type, currentPage, totalItems) {
            const startElement = document.getElementById(`${type}-start`);
            const endElement = document.getElementById(`${type}-end`);
            const totalElement = document.getElementById(`${type}-total`);
            const prevBtn = document.getElementById(`prev-${type}`);
            const nextBtn = document.getElementById(`next-${type}`);
            
            const start = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
            const end = Math.min(currentPage * itemsPerPage, totalItems);
            
            if (startElement) startElement.textContent = start;
            if (endElement) endElement.textContent = end;
            if (totalElement) totalElement.textContent = totalItems;
            
            if (prevBtn) {
                prevBtn.disabled = currentPage <= 1;
                prevBtn.classList.toggle('opacity-50', currentPage <= 1);
            }
            
            if (nextBtn) {
                nextBtn.disabled = end >= totalItems;
                nextBtn.classList.toggle('opacity-50', end >= totalItems);
            }
        }
        
        // Mudar página
        function changePage(delta, collection) {
            const newPage = collectionsData[collection].currentPage + delta;
            const totalPages = Math.ceil(collectionsData[collection].items.length / itemsPerPage);
            
            if (newPage >= 1 && newPage <= totalPages) {
                collectionsData[collection].currentPage = newPage;
                renderItems(collection);
            }
        }
        
        // ======================
        // FUNÇÕES DE NAVEGAÇÃO
        // ======================
        
        // Alternar sidebar em mobile
        function toggleSidebarMobile() {
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            
            sidebar.classList.toggle('translate-x-0');
            sidebarOverlay.classList.toggle('hidden');
            
            // Bloquear scroll do body quando sidebar está aberta
            document.body.style.overflow = sidebar.classList.contains('translate-x-0') ? 'hidden' : '';
        }
        
        // Alternar sidebar em desktop
  function toggleSidebarDesktop() {
    const sidebar = document.getElementById('sidebar');
    const contentArea = document.getElementById('contentArea');
    const icon = document.querySelector('#toggleSidebar i');
    const logoTitle = document.getElementById('logoTitle');
    const toggleButton = document.getElementById('toggleSidebar');

    // Alterar largura da sidebar
    sidebar.classList.toggle('w-20');
    sidebar.classList.toggle('w-72');

    // Alterar margem do conteúdo
    contentArea.classList.toggle('lg:ml-72');
    contentArea.classList.toggle('lg:ml-20');
    contentArea.classList.toggle('content-minimized');

    // Alternar visibilidade do texto do logo com delay suave
    if (sidebar.classList.contains('w-20')) {
        logoTitle.classList.add('opacity-0');
        setTimeout(() => {
            logoTitle.classList.add('hidden');
        }, 300);
    } else {
        logoTitle.classList.remove('hidden');
        setTimeout(() => {
            logoTitle.classList.remove('opacity-0');
        }, 10);
    }

    // Trocar ícone
    icon.classList.toggle('fa-chevron-left');
    icon.classList.toggle('fa-chevron-right');

    // Pintar botão
    toggleButton.classList.add('bg-black', 'text-white');

    // Alternar textos do menu
    document.querySelectorAll('.sidebar-text').forEach(el => {
        el.classList.toggle('hidden');
    });
}


        
function navigateToTab(tabId) {
    // Atualizar tab ativa na sidebar
    document.querySelectorAll('[data-tab]').forEach(link => {
        link.classList.remove('bg-blue-700', 'text-white');
        link.classList.add('hover:bg-blue-700');
    });

    const activeLink = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeLink) {
        activeLink.classList.add('bg-blue-700', 'text-white');
        activeLink.classList.remove('hover:bg-blue-700');
    }

    // Mostrar conteúdo da tab selecionada
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    const tabContent = document.getElementById(`${tabId}Tab`);
    if (tabContent) {
        tabContent.classList.remove('hidden');
        tabContent.classList.add('fade-in');
    }

    if (tabId === 'p-produtos') {
        loadItems('P_produtos');
    } else if (tabId === 'p-carrossel') {
        loadItems('P_carrossel');
    }
    

    // Atualizar título do header
    const headerTitle = document.getElementById('pageTitle');
    const tabTitles = {
        'dashboard': 'Dashboard de Produtos',
        'products': 'Lista de Produtos',
        'add-product': 'Adicionar Produto',
        'reports': 'Gerar Relatório',
        'p-produtos': 'Produtos em Promoção',
        'depoimentos': 'Depoimentos',
        'p-carrossel': 'Carrossel de Promoções',
        'vantagens': 'Vantagens'
    };

    if (headerTitle) {
        headerTitle.textContent = tabTitles[tabId] || 'Dashboard';
    }

    // Fechar sidebar em mobile
    if (window.innerWidth < 1024) {
        toggleSidebarMobile();
    }
}

    // Adicione esta parte no final da função:
    if (tabId === 'p-produtos') {
        console.log('Carregando P_produtos...');
        loadItems('P_produtos').then(() => {
            console.log('P_produtos carregados com sucesso');
        }).catch(error => {
            console.error('Erro ao carregar P_produtos:', error);
        });
    }


function handleTabClick(e) {
    e.preventDefault();
    const tabId = this.getAttribute('data-tab');
    navigateToTab(tabId);
}


  
        // Manipular redimensionamento da janela
        function handleWindowResize() {
            const sidebar = document.getElementById('sidebar');
            const contentArea = document.getElementById('contentArea');
            
            if (window.innerWidth >= 1024) {
                // Desktop - garantir que a sidebar esteja visível
                sidebar.classList.remove('-translate-x-full');
                document.getElementById('sidebarOverlay').classList.add('hidden');
                document.body.style.overflow = '';
            } else {
                // Mobile - garantir que a sidebar esteja escondida
                sidebar.classList.add('-translate-x-full');
            }
        }
        
        // ======================
        // GRÁFICOS
        // ======================
        
        // Inicializar gráficos
        function initializeCharts() {
            const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');
            const priceCtx = document.getElementById('priceDistributionChart')?.getContext('2d');
            
            if (categoryCtx) {
                categoryChart = new Chart(categoryCtx, {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Produtos por Categoria',
                            data: [],
                            backgroundColor: 'rgba(59, 130, 246, 0.7)',
                            borderColor: 'rgba(59, 130, 246, 1)',
                            borderWidth: 1,
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: { 
                            y: { 
                                beginAtZero: true, 
                                ticks: { 
                                    stepSize: 1,
                                    precision: 0
                                } 
                            },
                            x: {
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });
            }
            
            if (priceCtx) {
                priceDistributionChart = new Chart(priceCtx, {
                    type: 'pie',
                    data: {
                        labels: [],
                        datasets: [{
                            data: [],
                            backgroundColor: [
                                'rgba(59, 130, 246, 0.7)',
                                'rgba(168, 85, 247, 0.7)',
                                'rgba(16, 185, 129, 0.7)',
                                'rgba(245, 158, 11, 0.7)',
                                'rgba(239, 68, 68, 0.7)'
                            ],
                            borderWidth: 0,
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                position: 'right',
                                labels: {
                                    boxWidth: 12,
                                    padding: 16
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${context.label}: ${context.raw} produtos`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
        
        // Atualizar gráficos
        function updateCharts() {
            if (!allProducts.length) return;
            
            // Gráfico de produtos por categoria
            if (categoryChart) {
                const categoryCounts = {};
                
                // Contar produtos por categoria
                allProducts.forEach(product => {
                    const category = product.category || 'Outros';
                    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                });
                
                // Ordenar categorias por contagem (decrescente)
                const sortedCategories = Object.entries(categoryCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10); // Limitar a 10 categorias para melhor visualização
                
                categoryChart.data.labels = sortedCategories.map(([category]) => category);
                categoryChart.data.datasets[0].data = sortedCategories.map(([_, count]) => count);
                categoryChart.update();
            }
            
            // Gráfico de distribuição de preços
            if (priceDistributionChart) {
                const priceRanges = [
                    { min: 0, max: 50, label: 'R$ 0 - 50' },
                    { min: 50, max: 100, label: 'R$ 50 - 100' },
                    { min: 100, max: 200, label: 'R$ 100 - 200' },
                    { min: 200, max: 500, label: 'R$ 200 - 500' },
                    { min: 500, max: Infinity, label: 'R$ 500+' }
                ];
                
                const priceCounts = priceRanges.map(range => 
                    allProducts.filter(p => p.price >= range.min && p.price < range.max).length
                );
                
                priceDistributionChart.data.labels = priceRanges.map(r => r.label);
                priceDistributionChart.data.datasets[0].data = priceCounts;
                priceDistributionChart.update();
            }
        }
        
        // Mostrar modal
        function showModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        }
        
        // Esconder modal
        function hideModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            }
        }
        
        // Mostrar modal de confirmação
        function showConfirmModal(title, message, onConfirm) {
            document.getElementById('confirmModalTitle').textContent = title;
            document.getElementById('confirmModalText').textContent = message;
            
            const confirmBtn = document.getElementById('confirmModalConfirm');
            confirmBtn.onclick = async () => {
                try {
                    await onConfirm();
                    hideModal('confirmModal');
                } catch (error) {
                    console.error('Erro na ação de confirmação:', error);
                }
            };
            
            showModal('confirmModal');
        }
        
        // ======================
        // FUNÇÕES GLOBAIS
        // ======================
        
        // Visualizar produto
        window.viewProduct = function(id) {
            const product = allProducts.find(p => p.id === id);
            if (!product) return;
            
            document.getElementById('modal-product-image').src = product.image;
            document.getElementById('modal-product-name').textContent = product.name;
            document.getElementById('modal-product-category').textContent = product.category;
            document.getElementById('modal-product-price').textContent = `R$ ${product.price.toFixed(2)}`;
            document.getElementById('modal-product-description').textContent = product.description;
            
            document.getElementById('edit-product-btn').onclick = () => {
                hideModal('productModal');
                editProduct(id);
            };
            
            document.getElementById('delete-product-btn').setAttribute('data-product-id', id);
            
            showModal('productModal');
        };
        
        // Mostrar confirmação para excluir produto
        window.showDeleteProductConfirmation = function(id, name) {
            showConfirmModal(
                `Excluir "${name}"`,
                `Tem certeza que deseja excluir permanentemente o produto "${name}"? Esta ação não pode ser desfeita.`,
                () => deleteProduct(id)
            );
        };
        
// Atualize a função de confirmação de exclusão
window.showDeleteItemConfirmation = function(collection, id, name) {
    showConfirmModal(
        `Excluir "${name}"`,
        `Tem certeza que deseja excluir permanentemente este item?`,
        async () => {
            try {
                setSubmitButtonLoading(true);
                await deleteCollectionItem(collection, id);
                showSuccess('Item excluído com sucesso!');
            } catch (error) {
                showError('Erro ao excluir: ' + error.message);
            } finally {
                setSubmitButtonLoading(false);
            }
        }
    );
};

    // Atualize a função de exclusão
    async function deleteCollectionItem(collection, id) {
        console.log(`Excluindo ${collection} ID ${id}`);
        
        try {
            const response = await fetch(`${FIREBASE_URL}/${collection}/${id}.json`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Falha na exclusão');
            }

            // Atualizar lista local
            collectionsData[collection].items = collectionsData[collection].items.filter(item => item.id !== id);
            renderItems(collection);
            
            return true;
        } catch (error) {
            console.error('Erro na exclusão:', error);
            throw error;
        }
    }
        
        // Editar produto (abrir formulário)
        window.editProduct = function(id) {
            const product = allProducts.find(p => p.id === id);
            if (!product) return;
            
            // Preencher formulário
            const form = document.getElementById('productForm');
            form.querySelector('[name="Nome"]').value = product.name;
            form.querySelector('[name="Categoria"]').value = product.category;
            form.querySelector('[name="Preço"]').value = product.price;
            form.querySelector('[name="Descrição"]').value = product.description;
            
            // Adicionar ID oculto para edição
            if (!form.productId) {
                const idInput = document.createElement('input');
                idInput.type = 'hidden';
                idInput.name = 'productId';
                idInput.value = product.id;
                form.appendChild(idInput);
            } else {
                form.productId.value = product.id;
            }
            
            // Mudar para a aba de adicionar produto
            document.querySelector('[data-tab="add-product"]').click();
        };
        
        // Editar item de coleção
window.editItem = function(collection, id) {
    const item = collectionsData[collection].items.find(item => item.id === id);
    if (!item) return;

    const form = document.getElementById(`${collection.toLowerCase()}Form`);
    if (!form) return;

    // Preencher campos com base na coleção
    if (collection === 'P_carrossel') {
        form.querySelector('[name="Titulo"]').value = item.Titulo || '';
        form.querySelector('[name="Descricao"]').value = item.Descricao || '';
    } else {
        form.querySelector('[name="Nome"]').value = item.Nome || '';
        form.querySelector('[name="PrecoAntigo"]').value = item.PrecoAntigo || 0;
        form.querySelector('[name="PrecoNovo"]').value = item.PrecoNovo || 0;
    }
    
    document.getElementById(`${collection.toLowerCase()}-id`).value = item.id;

    // Preencher imagem se existir
    if (item.Imagem) {
        const previewImg = document.getElementById(`${collection.toLowerCase()}-imagem-preview`);
        const placeholderImg = document.getElementById(`${collection.toLowerCase()}-imagem-placeholder`);
        if (previewImg && placeholderImg) {
            previewImg.src = item.Imagem;
            previewImg.classList.remove('hidden');
            placeholderImg.classList.add('hidden');
            document.getElementById(`${collection.toLowerCase()}-imagem-url`).value = item.Imagem;
        }
    }

    // Atualizar estado
    collectionsData[collection].editingId = item.id;
    form.scrollIntoView({ behavior: 'smooth' });
};
        
        // Excluir item de coleção
        window.deleteItem = function(collection, id) {
            showConfirmModal(
                'Confirmar Exclusão',
                'Tem certeza que deseja excluir este item permanentemente?',
                () => deleteCollectionItem(collection, id)
            );
        };
        
        // Logout
        function logout() {
            localStorage.removeItem('userData');
            window.location.href = 'index.html';
        }

      document.addEventListener("DOMContentLoaded", () => {
        document.getElementById('toggleSidebar')
          .addEventListener('click', toggleSidebarDesktop);
      });

function setSubmitButtonLoading(isLoading) {
    const submitBtn = document.getElementById('p-produtos-submit');
    const submitText = document.getElementById('submit-text');
    const submitLoading = document.getElementById('submit-loading');
    
    if (isLoading) {
        submitBtn.disabled = true;
        submitText.classList.add('hidden');
        submitLoading.classList.remove('hidden');
        submitBtn.classList.remove('hover:bg-blue-700');
        submitBtn.classList.add('bg-blue-400', 'cursor-not-allowed');
    } else {
        submitBtn.disabled = false;
        submitText.classList.remove('hidden');
        submitLoading.classList.add('hidden');
        submitBtn.classList.add('hover:bg-blue-700');
        submitBtn.classList.remove('bg-blue-400', 'cursor-not-allowed');
    }
}
// Função para carregar itens do carrossel
async function loadP_carrossel() {
    try {
        const listElement = document.getElementById('P_carrossel-list');
        if (!listElement) {
            console.error('Elemento p-carrossel-list não encontrado');
            return;
        }

        // Mostrar estado de carregamento
        listElement.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-400">
                    <i class="fas fa-spinner spinner text-xl mr-2"></i>
                    Carregando itens do carrossel...
                </td>
            </tr>
        `;

        const response = await fetch(`${FIREBASE_URL}/P_carrossel.json`);
        if (!response.ok) throw new Error('Falha ao carregar carrossel');
        
        const data = await response.json();
        const items = data ? Object.entries(data).map(([key, value]) => ({
            id: key,
            Titulo: value.Titulo || '',
            Descricao: value.Descricao || '',
            Imagem: value.Imagem || ''
        })) : [];
        
        collectionsData.P_carrossel.items = items;
        renderItems('P_carrossel');
        return items;
    } catch (error) {
        console.error('Erro ao carregar carrossel:', error);
        showError('Erro ao carregar itens do carrossel');
        throw error;
    }
}





async function handleP_carrosselSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('p-carrossel-submit');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Desabilitar botão e mostrar loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner spinner mr-2"></i> Salvando...';
        
        const form = e.target;
        const formData = new FormData(form);
        const itemData = {
            Titulo: formData.get('Titulo'),
            Descricao: formData.get('Descricao'),
            Imagem: formData.get('Imagem') || ''
        };

        // Processar upload de imagem
        const imageInput = form.querySelector('input[type="file"]');
        if (imageInput?.files[0]) {
            itemData.Imagem = await handleImageUpload({ target: imageInput }, 'P_carrossel');
        }

        const itemId = formData.get('id');
        const isEdit = !!itemId;

        if (isEdit) {
            await updateCollectionItem('P_carrossel', itemId, itemData);
            showSuccess('Item do carrossel atualizado com sucesso!');
        } else {
            await addCollectionItem('P_carrossel', itemData);
            showSuccess('Item do carrossel adicionado com sucesso!');
        }

        // Recarregar e resetar formulário
        await loadItems('P_carrossel');
        resetForm('p-carrosselForm');
        collectionsData.P_carrossel.editingId = null;

    } catch (error) {
        console.error('Erro ao salvar item do carrossel:', error);
        showError(`Erro ao salvar: ${error.message}`);
    } finally {
        // Restaurar botão
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}