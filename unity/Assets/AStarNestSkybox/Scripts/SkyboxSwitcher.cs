using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class SkyboxSwitcher : MonoBehaviour {

	Material[] mats;
	public int current = 0;
	string message = 
@"";
	
	

	void Start() {
		mats = Resources.LoadAll<Material>("");

		Load(0);
	}
	
	void Update() {
		if (Input.GetKeyDown("[")) { Load(--current); }
		if (Input.GetKeyDown("]")) { Load(++current); }

	}

	void OnGUI() {
		string readout = " " + CameraScroll.main.speed;
		readout += "" + CameraScroll.main.acceleration;
		readout += "" + CameraScroll.main.velocity;
		readout += "" + mats[current].name;

		


	}
	
	void Load(int i) {
		if (i < 0) { i = mats.Length + i; }
		i = i % mats.Length;
		current = i;
		Material mat = mats[i];
		RenderSettings.skybox = mat;



		float step = mat.GetFloat("_StepSize");
		
		mat.SetFloat("_CamScroll", 55 * Mathf.Sign(step));

	}

}
