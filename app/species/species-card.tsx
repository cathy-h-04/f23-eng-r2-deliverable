"use client";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import type { Database } from "@/lib/schema";
import Image from "next/image";
type Species = Database["public"]["Tables"]["species"]["Row"];

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SpeciesCard(species: Species) {

  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [speciesData, setSpeciesData] = useState<Species | null>(null); // Initialize as null, stores fetched species data. 

  const onClick = async () => {
    // The `input` prop contains data that has already been processed by zod. We can now use it in a supabase query
    const supabase = createClientComponentClient<Database>();
    // fetches species based on Scientific name. 
    const { data, error } = await supabase
      .from("species")
      .select("*")
      .eq("scientific_name", species.scientific_name)
      .single(); 

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }
    else
    {
      setSpeciesData(data); // Store the retrieved data
      setOpenDialog(true); // Show the dialog
    }
    return data;
  };

  return (
    <div className="min-w-72 m-4 w-72 flex-none rounded border-2 p-3 shadow">
      {species.image && (
        <div className="relative h-40 w-full">
          <Image src={species.image} alt={species.scientific_name} fill style={{ objectFit: "cover" }} />
        </div>
      )}
      <h3 className="mt-3 text-2xl font-semibold">{species.common_name}</h3>
      <h4 className="text-lg font-light italic">{species.scientific_name}</h4>
      <p>{species.description ? species.description.slice(0, 150).trim() + "..." : ""}</p>
      {/* Replace with detailed view */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <Button className="mt-3 w-full" onClick={onClick}>Learn More</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detailed View</DialogTitle>
          <DialogDescription>
          {speciesData && (
                  <>
                    <p>Scientific Name: {speciesData.scientific_name}</p>
                    <p>Common Name: {speciesData.common_name}</p>
                    <p>Total Population: {speciesData.total_population}</p>
                    <p>Kingdom: {speciesData.kingdom}</p>
                    <p>Description: {speciesData.description}</p>
                  </>
                )}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
    </div>
  );
}




