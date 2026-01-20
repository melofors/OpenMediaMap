--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_actions (
    id integer NOT NULL,
    admin_username text NOT NULL,
    action_type text NOT NULL,
    record_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT admin_actions_action_type_check CHECK ((action_type = ANY (ARRAY['approve'::text, 'reject'::text, 'delete'::text])))
);


ALTER TABLE public.admin_actions OWNER TO postgres;

--
-- Name: admin_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_actions_id_seq OWNER TO postgres;

--
-- Name: admin_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_actions_id_seq OWNED BY public.admin_actions.id;


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.submissions (
    id integer NOT NULL,
    caption text,
    source text,
    photographer text,
    photo_url text,
    geom public.geometry(Point,4326),
    status text DEFAULT 'pending'::text,
    created_at timestamp without time zone DEFAULT now(),
    year integer,
    month integer,
    day integer,
    estimated boolean DEFAULT false,
    location boolean DEFAULT true,
    notes text,
    deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    delete_reason text,
    user_id text
);


ALTER TABLE public.submissions OWNER TO postgres;

--
-- Name: submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.submissions_id_seq OWNER TO postgres;

--
-- Name: submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.submissions_id_seq OWNED BY public.submissions.id;


--
-- Name: admin_actions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_actions ALTER COLUMN id SET DEFAULT nextval('public.admin_actions_id_seq'::regclass);


--
-- Name: submissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions ALTER COLUMN id SET DEFAULT nextval('public.submissions_id_seq'::regclass);


--
-- Data for Name: admin_actions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_actions (id, admin_username, action_type, record_id, created_at) FROM stdin;
1	hasan	approve	1	2026-01-05 01:54:27.869511
\.


--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.submissions (id, caption, source, photographer, photo_url, geom, status, created_at, year, month, day, estimated, location, notes, deleted, deleted_at, delete_reason, user_id) FROM stdin;
1	Featherbed Lane	<a href="https://www.newspapers.com/article/the-evening-sun/100617651/" target="_blank" rel="noopener noreferrer"><i>Featherbed Lane, On Way To Johnnycake Town</i></a>. Unknown. The Evening Sun. 1920	\N	https://openmediamap.nyc3.cdn.digitaloceanspaces.com/submissions/pending/421816b5-ceb7-4e70-9616-b193250f58d2.png	0101000020E6100000AC730CC85E2F53C061545227A0A94340	approved	2026-01-05 01:54:21.583391	1920	10	27	t	t	The exact location of the photo is unknown.	f	\N	\N	hasan
\.


--
-- Name: admin_actions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_actions_id_seq', 1, true);


--
-- Name: submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.submissions_id_seq', 1, true);


--
-- Name: admin_actions admin_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: admin_actions admin_actions_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.submissions(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

