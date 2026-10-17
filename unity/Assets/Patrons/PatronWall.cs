using System;
using System.IO;
using System.Security.Cryptography;
using UnityEngine;

namespace EFS.Patrons
{
    [Serializable]
    public class PatronEntry
    {
        public string displayName;
        public string message;
        public string tier;
    }

    [Serializable]
    public class PatronRenderList
    {
        public string schemaVersion;
        public PatronEntry[] patrons;
    }

    /// <summary>
    /// Inscribes the approved patron list on the rear hemisphere (behind the default camera), so turning
    /// away from the audio-responsive orb shows the patrons. Reads the moderated render list written by
    /// src/lib/patrons; it never reads patrons.json and never shows an entry the TypeScript gate dropped.
    /// Add it to a scene, or pass -patronsFile &lt;path&gt; on the command line and it creates itself.
    /// One material per tier: plain, sparkly, glowing, ethereal.
    /// </summary>
    public class PatronWall : MonoBehaviour
    {
        public const string ExpectedSchema = "efs-patron-wall-v1";

        [Tooltip("Render list JSON. Overridden by the -patronsFile command-line argument.")]
        public string patronsFile = "";
        public float radius = 18f;
        public float charSize = 0.05f;
        public int fontSize = 64;

        Material plain, sparkly, glowing, ethereal;
        Font font;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void AutoCreate()
        {
            if (string.IsNullOrEmpty(ReadCommandLineFile())) return;
            if (FindObjectOfType<PatronWall>() != null) return;
            new GameObject("PatronWall").AddComponent<PatronWall>();
        }

        static string ReadCommandLineFile()
        {
            var args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
                if (args[i] == "-patronsFile") return args[i + 1];
            return null;
        }

        void Start()
        {
            string file = ReadCommandLineFile() ?? patronsFile;
            if (string.IsNullOrEmpty(file)) return;
            if (!File.Exists(file)) { Debug.LogError("[PatronWall] patrons file missing: " + file); return; }

            byte[] bytes = File.ReadAllBytes(file);
            var list = JsonUtility.FromJson<PatronRenderList>(System.Text.Encoding.UTF8.GetString(bytes));
            if (list == null || list.schemaVersion != ExpectedSchema || list.patrons == null)
            {
                Debug.LogError("[PatronWall] unsupported patron list; refusing to render");
                return;
            }

            BuildMaterials();
            var cam = Camera.main;
            // "Behind" = opposite the default camera's horizontal facing.
            Vector3 fwd = cam != null ? cam.transform.forward : Vector3.forward;
            fwd.y = 0f;
            if (fwd.sqrMagnitude < 1e-6f) fwd = Vector3.forward;
            Vector3 origin = cam != null ? cam.transform.position : Vector3.zero;
            float backYaw = Mathf.Atan2(-fwd.x, -fwd.z) * Mathf.Rad2Deg;

            var slots = PatronWallLayout.Compute(list.patrons.Length);
            for (int i = 0; i < list.patrons.Length; i++)
                Place(list.patrons[i], slots[i], origin, backYaw);

            Debug.Log("[PatronWall] Placed " + list.patrons.Length + " patrons hash=" + Sha256Hex(bytes));
        }

        void BuildMaterials()
        {
            font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            plain = MakeMaterial(new Color(0.92f, 0.92f, 0.96f, 0.9f));
            sparkly = MakeMaterial(new Color(1f, 0.92f, 0.65f, 1f));
            glowing = MakeMaterial(new Color(0.7f, 0.9f, 1f, 1f));
            ethereal = MakeMaterial(new Color(0.78f, 0.7f, 1f, 1f));
        }

        Material MakeMaterial(Color c)
        {
            var m = new Material(font.material) { color = c };
            m.renderQueue = 3100;
            return m;
        }

        void Place(PatronEntry p, PatronSlot slot, Vector3 origin, float backYaw)
        {
            float yaw = backYaw + (float)slot.AzimuthDeg;
            float pitch = (float)slot.ElevationDeg;
            Quaternion rot = Quaternion.Euler(-pitch, yaw, 0f);
            Vector3 pos = origin + rot * Vector3.forward * radius;

            string text = string.IsNullOrEmpty(p.message) ? p.displayName : p.displayName + "\n" + p.message;
            var go = new GameObject("Patron_" + p.tier);
            go.transform.SetParent(transform, false);
            go.transform.position = pos;
            // TextMesh reads correctly when viewed along +Z, so aim +Z from the viewer out to the slot.
            go.transform.rotation = Quaternion.LookRotation(pos - origin, Vector3.up);

            bool big = p.tier == "ethereal";
            var tm = AddText(go, text, MaterialFor(p.tier), big ? 1.35f : 1f);
            if (p.tier == "glowing" || p.tier == "ethereal")
            {
                // Soft halo: a larger, dimmer copy behind the letters.
                var halo = new GameObject("Halo");
                halo.transform.SetParent(go.transform, false);
                halo.transform.localPosition = new Vector3(0f, 0f, 0.05f);
                var ht = AddText(halo, text, MaterialFor(p.tier), (big ? 1.35f : 1f) * 1.08f);
                var c = ht.color; c.a = 0.35f; ht.color = c;
            }
            if (p.tier == "ethereal") go.AddComponent<PatronBob>();
        }

        TextMesh AddText(GameObject go, string text, Material mat, float scale)
        {
            var tm = go.AddComponent<TextMesh>();
            tm.text = text;
            tm.font = font;
            tm.fontSize = fontSize;
            tm.characterSize = charSize * scale;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.color = Color.white; // tier colour comes from the shared tier material
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            return tm;
        }

        Material MaterialFor(string tier)
        {
            switch (tier)
            {
                case "sparkly": return sparkly;
                case "glowing": return glowing;
                case "ethereal": return ethereal;
                default: return plain;
            }
        }

        void Update()
        {
            if (sparkly == null) return;
            float t = Time.time;
            // Sparkle: fast brightness flicker on the shared tier material.
            float s = 0.75f + 0.25f * Mathf.Sin(t * 9f) * Mathf.Sin(t * 5.3f + 1.7f);
            sparkly.color = new Color(1f * s, 0.92f * s, 0.65f * s, 1f);
            // Glow: slow breathing.
            float g = 0.85f + 0.15f * Mathf.Sin(t * 1.2f);
            glowing.color = new Color(0.7f * g, 0.9f * g, 1f * g, 1f);
            // Ethereal: slow hue drift.
            ethereal.color = Color.HSVToRGB(Mathf.Repeat(0.72f + 0.08f * Mathf.Sin(t * 0.3f), 1f), 0.35f, 1f);
        }

        static string Sha256Hex(byte[] bytes)
        {
            using (var sha = SHA256.Create())
            {
                var h = sha.ComputeHash(bytes);
                var sb = new System.Text.StringBuilder(h.Length * 2);
                foreach (var b in h) sb.Append(b.ToString("x2"));
                return sb.ToString();
            }
        }
    }

    /// <summary>Gentle vertical float for the ethereal tier.</summary>
    public class PatronBob : MonoBehaviour
    {
        Vector3 basePos;
        float phase;
        void Start() { basePos = transform.position; phase = UnityEngine.Random.value * 6.28f; }
        void Update() { transform.position = basePos + Vector3.up * (0.08f * Mathf.Sin(Time.time * 0.6f + phase)); }
    }
}
