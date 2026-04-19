-- ============================================
-- VIZU - BANCO DE DADOS COMPLETO
-- Execute no SQL Editor do Supabase
-- ============================================

-- ========== 1. TABELA DE PERFIS ==========
CREATE TABLE IF NOT EXISTS perfis (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    nome_completo TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    localizacao TEXT DEFAULT '',
    website TEXT DEFAULT '',
    seguidores INTEGER DEFAULT 0,
    seguindo INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== 2. TABELA DE POSTS ==========
CREATE TABLE IF NOT EXISTS posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    imagem_url TEXT NOT NULL,
    legenda TEXT DEFAULT '',
    curtidas INTEGER DEFAULT 0,
    comentarios_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== 3. TABELA DE CURTIDAS ==========
CREATE TABLE IF NOT EXISTS curtidas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(usuario_id, post_id)
);

-- ========== 4. TABELA DE COMENTÁRIOS ==========
CREATE TABLE IF NOT EXISTS comentarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== 5. TABELA DE SEGUIDORES ==========
CREATE TABLE IF NOT EXISTS seguidores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seguidor_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    seguindo_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(seguidor_id, seguindo_id)
);

-- ========== 6. TABELA DE STORIES ==========
CREATE TABLE IF NOT EXISTS stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    imagem_url TEXT NOT NULL,
    visualizacoes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ========== 7. TABELA DE MENSAGENS ==========
CREATE TABLE IF NOT EXISTS mensagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    remetente_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    destinatario_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== 8. TABELA DE NOTIFICAÇÕES ==========
CREATE TABLE IF NOT EXISTS notificacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    origem_id UUID,
    origem_nome TEXT,
    lida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== 9. TABELA DE REELS ==========
CREATE TABLE IF NOT EXISTS reels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    legenda TEXT DEFAULT '',
    curtidas INTEGER DEFAULT 0,
    comentarios_count INTEGER DEFAULT 0,
    duracao INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== 10. TABELA DE MARCAÇÕES ==========
CREATE TABLE IF NOT EXISTS marcacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, usuario_id)
);

-- ========== ÍNDICES PARA PERFORMANCE ==========
CREATE INDEX IF NOT EXISTS idx_posts_usuario ON posts(usuario_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_curtidas_post ON curtidas(post_id);
CREATE INDEX IF NOT EXISTS idx_curtidas_usuario ON curtidas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_post ON comentarios(post_id);
CREATE INDEX IF NOT EXISTS idx_seguidores_seguindo ON seguidores(seguindo_id);
CREATE INDEX IF NOT EXISTS idx_seguidores_seguidor ON seguidores(seguidor_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario ON mensagens(destinatario_id, lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id, lida);
CREATE INDEX IF NOT EXISTS idx_reels_usuario ON reels(usuario_id);
CREATE INDEX IF NOT EXISTS idx_marcacoes_usuario ON marcacoes(usuario_id);

-- ========== TRIGGERS ==========

-- Atualizar contagem de curtidas
CREATE OR REPLACE FUNCTION atualizar_curtidas()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET curtidas = curtidas + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET curtidas = curtidas - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_curtidas
AFTER INSERT OR DELETE ON curtidas
FOR EACH ROW EXECUTE FUNCTION atualizar_curtidas();

-- Atualizar contagem de seguidores
CREATE OR REPLACE FUNCTION atualizar_seguidores()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE perfis SET seguidores = seguidores + 1 WHERE id = NEW.seguindo_id;
        UPDATE perfis SET seguindo = seguindo + 1 WHERE id = NEW.seguidor_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE perfis SET seguidores = seguidores - 1 WHERE id = OLD.seguindo_id;
        UPDATE perfis SET seguindo = seguindo - 1 WHERE id = OLD.seguidor_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_seguidores
AFTER INSERT OR DELETE ON seguidores
FOR EACH ROW EXECUTE FUNCTION atualizar_seguidores();

-- Atualizar updated_at
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_perfis_updated
BEFORE UPDATE ON perfis
FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_posts_updated
BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

-- ========== POLÍTICAS DE SEGURANÇA (RLS) ==========

-- Habilitar RLS
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE curtidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcacoes ENABLE ROW LEVEL SECURITY;

-- Políticas para PERFIS
CREATE POLICY "Perfis são públicos" ON perfis
    FOR SELECT USING (true);

CREATE POLICY "Usuários podem editar próprio perfil" ON perfis
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para POSTS
CREATE POLICY "Posts são públicos" ON posts
    FOR SELECT USING (true);

CREATE POLICY "Usuários podem criar posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem editar próprios posts" ON posts
    FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar próprios posts" ON posts
    FOR DELETE USING (auth.uid() = usuario_id);

-- ========== FUNÇÕES ÚTEIS ==========

-- Buscar feed do usuário
CREATE OR REPLACE FUNCTION get_user_feed(user_id UUID)
RETURNS SETOF posts AS $$
BEGIN
    RETURN QUERY
    SELECT p.*
    FROM posts p
    WHERE p.usuario_id IN (
        SELECT seguindo_id 
        FROM seguidores 
        WHERE seguidor_id = user_id
    )
    OR p.usuario_id = user_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Buscar stories ativos
CREATE OR REPLACE FUNCTION get_active_stories()
RETURNS SETOF stories AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM stories
    WHERE expires_at > NOW()
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ========== FIM ==========
SELECT '✅ Banco de dados Vizu criado com sucesso!' as status;