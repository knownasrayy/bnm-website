-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'staff_cd', 'staff_medpro', 'staff_ms', 'staff_cc', 'requester');
CREATE TYPE public.target_division AS ENUM ('CD', 'MEDPRO', 'MS', 'CC');
CREATE TYPE public.request_status AS ENUM ('pending_approval', 'in_progress', 'revision_needed', 'completed', 'rejected', 'forwarded');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  division TEXT NOT NULL,
  contact_wa TEXT,
  contact_line TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create requests table
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_division target_division NOT NULL,
  request_type TEXT NOT NULL,
  project_title TEXT NOT NULL,
  project_description TEXT NOT NULL,
  reference_links TEXT[],
  usage_date TIMESTAMP WITH TIME ZONE NOT NULL,
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status request_status DEFAULT 'pending_approval' NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,
  revision_notes TEXT,
  forwarded_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create request_files table for file uploads
CREATE TABLE public.request_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_files ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to check if user has any staff role
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'staff_cd', 'staff_medpro', 'staff_ms', 'staff_cc')
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Staff can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_staff(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for requests
CREATE POLICY "Requesters can view their own requests"
  ON public.requests FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "Requesters can create requests"
  ON public.requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Staff can view requests for their division"
  ON public.requests FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    (public.has_role(auth.uid(), 'staff_cd') AND target_division = 'CD') OR
    (public.has_role(auth.uid(), 'staff_medpro') AND target_division = 'MEDPRO') OR
    (public.has_role(auth.uid(), 'staff_ms') AND target_division = 'MS') OR
    (public.has_role(auth.uid(), 'staff_cc') AND target_division = 'CC')
  );

CREATE POLICY "Staff can update requests for their division"
  ON public.requests FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR
    (public.has_role(auth.uid(), 'staff_cd') AND target_division = 'CD') OR
    (public.has_role(auth.uid(), 'staff_medpro') AND target_division = 'MEDPRO') OR
    (public.has_role(auth.uid(), 'staff_ms') AND target_division = 'MS') OR
    (public.has_role(auth.uid(), 'staff_cc') AND target_division = 'CC')
  );

-- RLS Policies for request_files
CREATE POLICY "Users can view files for requests they can access"
  ON public.request_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_files.request_id
      AND (
        requests.requester_id = auth.uid() OR
        public.is_staff(auth.uid())
      )
    )
  );

CREATE POLICY "Users can upload files to their own requests"
  ON public.request_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_files.request_id
      AND requests.requester_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, division)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'division', 'Unknown')
  );
  
  -- Auto-assign requester role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'requester');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for request files
INSERT INTO storage.buckets (id, name, public)
VALUES ('request-files', 'request-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload files to their requests"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'request-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view files from their requests"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'request-files' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      public.is_staff(auth.uid())
    )
  );

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'request-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );