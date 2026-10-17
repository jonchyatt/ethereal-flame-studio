using EFS.Patrons;
using UnityEditor;
using UnityEngine;

/// <summary>
/// Editor-free-logic check for the patron wall layout (the project has no test assembly).
/// Menu: Tools/EFS/Check Patron Wall Layout. Batch: -executeMethod PatronWallSelfCheck.Run
/// </summary>
public static class PatronWallSelfCheck
{
    [MenuItem("Tools/EFS/Check Patron Wall Layout")]
    public static void Run()
    {
        string error = PatronWallLayout.SelfCheck();
        if (error != null)
        {
            Debug.LogError("[PatronWallSelfCheck] FAILED: " + error);
            if (Application.isBatchMode) EditorApplication.Exit(1);
            return;
        }
        Debug.Log("[PatronWallSelfCheck] OK");
        if (Application.isBatchMode) EditorApplication.Exit(0);
    }
}
