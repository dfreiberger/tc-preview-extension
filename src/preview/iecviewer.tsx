import React, { useState } from 'react';
import { useEffect } from 'react';

import 'prismjs';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-iecst'; // Language
import "prismjs/plugins/line-numbers/prism-line-numbers";
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prism-themes/themes/prism-vs.min.css'; // Theme

Prism.manual = true;

type IecViewerData = {
    xml?: XMLDocument;
}

type IecElement = {
    name: string,
    element: Element
}

const IecSection = ({ name, element }: IecElement) => {
    const declaration = element.getElementsByTagName("Declaration")[0];
    const declarationContent = declaration ? declaration.textContent : "No content"

    const implementation = element.getElementsByTagName("Implementation")[0];
    const implementationST = implementation ? implementation.getElementsByTagName("ST")[0] : null;
    const implementationContent = implementationST ? implementationST.textContent : "Unable to display content, it may be an unsupported format"

    return (
        <div>
            <h4>{name}</h4>
            {(declaration && 
            <pre className='line-numbers'>
                <code className='language-iecst'>
                    {declarationContent}
                </code>
            </pre> )}
            {(implementation && 
            <pre className='line-numbers'> 
                <code className='language-iecst'>
                    {implementationContent}
                </code>
            </pre> )}
        </div>
    )
};


const PouOrItfSection = ({ element }: IecElement) => {
    const pouNodes = Array.from(element.children);
    const pouName = `(POU) ${element.getAttribute("Name")}`;

    pouNodes.sort((a, b) => {
        try {
            var aFolder = a.getAttribute("FolderPath") ?? "";
            var aName = a.getAttribute("Name") ?? "";
            var aAttr = aFolder + aName;

            var bFolder = b.getAttribute("FolderPath") ?? "";
            var bName = b.getAttribute("Name") ?? "";
            var bAttr = bFolder + bName;

            if (aAttr < bAttr)
                return -1; // First should be sorted above second
            else if (aAttr < bAttr)
                return 1; // Second should be sorted above first
            return 0;
        }
        catch
        {
            return 1;
        }
    });

    // Get all Methods, Actions, Transitions, and Properties
    return (
        <div>
            <IecSection key={pouName} name={pouName} element={element} />
            {pouNodes.map((c, i) => {
                const folderPath = c.getAttribute("FolderPath");
                var childName = folderPath ? folderPath : "";
                childName += c.getAttribute("Name");
                var name = `(${c.nodeName}) ${childName}`;

                switch (c.nodeName) {
                    case "Method":
                    case "Action":
                    case "Transition":
                        return <IecSection key={name} name={name} element={c} />
                    case "Property":
                        const setter = c.getElementsByTagName("Set")[0];
                        const getter = c.getElementsByTagName("Get")[0];
                        var sections = new Array();
                        if (setter) {
                            const pName = name + ".Set";
                            sections.push(<IecSection key={pName} name={pName} element={setter} />);
                        }
                        if (getter) {
                            const pName = name + ".Get";
                            sections.push(<IecSection key={pName} name={pName} element={getter} />);
                        }
                        return sections;
                    case "Folder":
                        break;
                    default:
                        //
                }
            })
        }
        </div>
    )
}

const IecViewer = ({ xml }: IecViewerData) => {
    if (!xml) {
        return (
            <div>No content</div>
        )
    }
    
    useEffect(() => {
        Prism.highlightAll();
    }, [xml]);

    return (
        <div>
            {Array.from(xml.children[0].children).map((n, i) => {
                var name = n.getAttribute("Name") ?? "?";
                switch (n.nodeName) {
                    case "DUT":
                        return <IecSection key={i} name={name} element={n}/>
                    case "POU":
                        return <PouOrItfSection key={i} name={name} element={n}/>
                        break;
                    case "GVL":
                        return <IecSection key={i} name={name} element={n}/>
                        break;
                    case "Itf":
                        return <PouOrItfSection key={i} name={name} element={n}/>
                        break;
                    default:
                        console.log("Unsupported type, ", n.nodeName);
                }
            })}
        </div>
    )
};

export default IecViewer;